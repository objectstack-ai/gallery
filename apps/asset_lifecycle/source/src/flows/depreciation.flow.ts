import { defineFlow } from '@objectstack/spec';
import { v } from './_cel.js';

// One month, straight line, no salvage value: purchase cost / useful life,
// rounded to cents and capped at what is left of the book value.
const MONTHLY = 'double(round(double(item.purchase_cost) * 100.0 / double(category.useful_life_months))) / 100.0';
const REMAINING = '(item.book_value != null ? double(item.book_value) : double(item.purchase_cost))';
const SHOULD_POST =
  "existing == null && category != null && category.depreciation_method == 'straight_line' && " +
  `category.useful_life_months > 0 && ${REMAINING} > 0.0`;

/**
 * Month-end depreciation run. On the last day of each month it posts one month
 * of depreciation for every asset that is not disposed of and was bought
 * before this month (nothing is posted for the purchase month).
 *
 * Each entry it creates is rolled up into the asset's accumulated depreciation,
 * which in turn lowers its book value. Posting is idempotent: an asset that
 * already has an entry for the month is skipped (and a unique index on asset,
 * period and kind refuses a duplicate), so a re-run posts only what is missing.
 */
export const PostMonthlyDepreciationFlow = defineFlow({
  name: 'post_monthly_depreciation',
  label: 'Post monthly depreciation',
  description: 'On the last day of each month, posts one month of straight-line depreciation for every asset not disposed of.',
  type: 'schedule',
  status: 'active',
  runAs: 'system', // a scheduled run has no user
  variables: [
    { name: 'period', type: 'text' },
    { name: 'month_start', type: 'text' },
    { name: 'posted_on', type: 'text' },
    { name: 'posted_count', type: 'number', isOutput: true, defaultValue: 0 },
    { name: 'failed_count', type: 'number', isOutput: true, defaultValue: 0 },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Last day of each month, 23:00 UTC',
      config: { schedule: { type: 'cron', expression: '0 23 L * *' } },
    },
    {
      id: 'set_period',
      type: 'assignment',
      label: 'This month is the period',
      config: {
        assignments: {
          period: v('isoDate(today()).substring(0, 7)'),
          month_start: v("isoDate(today()).substring(0, 7) + '-01'"),
          posted_on: v('isoDate(today())'),
        },
      },
    },
    {
      id: 'get_assets',
      type: 'get_record',
      label: 'Assets not disposed of, bought before this month',
      config: {
        objectName: 'demoasset_asset',
        filter: { status: { $ne: 'disposed' }, purchase_date: { $lt: v('month_start') } },
        limit: 5000,
        outputVariable: 'assets',
      },
    },
    {
      id: 'each_asset',
      type: 'loop',
      label: 'For each asset',
      config: {
        collection: v('assets'),
        iteratorVariable: 'item',
        maxIterations: 5000,
        body: {
          nodes: [
            {
              // One asset that cannot be posted must not stop the run for the others.
              id: 'post_one',
              type: 'try_catch',
              label: 'Post this asset',
              config: {
                try: {
                  nodes: [
                  {
                    id: 'get_category',
                    type: 'get_record',
                    label: "Read the asset's category",
                    config: {
                      objectName: 'demoasset_asset_category',
                      filter: { id: v('item.category') },
                      outputVariable: 'category',
                    },
                  },
                  {
                    id: 'get_existing',
                    type: 'get_record',
                    label: 'Already posted for this month?',
                    config: {
                      objectName: 'demoasset_depreciation_entry',
                      filter: { asset: v('item.id'), period: v('period'), kind: 'depreciation' },
                      outputVariable: 'existing',
                    },
                  },
                  { id: 'should_post', type: 'decision', label: 'Post this month?' },
                  {
                    id: 'post_entry',
                    type: 'create_record',
                    label: 'Post one month of depreciation',
                    config: {
                      objectName: 'demoasset_depreciation_entry',
                      fields: {
                        asset: v('item.id'),
                        period: v('period'),
                  kind: 'depreciation',
                        posted_on: v('posted_on'),
                        amount: v(`min(${MONTHLY}, ${REMAINING})`),
                      },
                    },
                  },
                  {
                    id: 'count_posted',
                    type: 'assignment',
                    label: 'Count the entry',
                    config: { assignments: { posted_count: v('posted_count + 1') } },
                  },
                  {
                    id: 'next_asset',
                    type: 'assignment',
                    label: 'Next asset',
                    config: { assignments: { existing: null, category: null } },
                  },
                  ],
                  edges: [
                  { id: 'b1', source: 'get_category', target: 'get_existing' },
                  { id: 'b2', source: 'get_existing', target: 'should_post' },
                  { id: 'b3', source: 'should_post', target: 'post_entry', label: 'yes', condition: SHOULD_POST },
                  { id: 'b4', source: 'should_post', target: 'next_asset', label: 'no', condition: `!(${SHOULD_POST})` },
                  { id: 'b5', source: 'post_entry', target: 'count_posted' },
                  { id: 'b6', source: 'count_posted', target: 'next_asset' },
                  ],
                },
                catch: {
                  nodes: [
                    {
                      id: 'count_failed',
                      type: 'assignment',
                      label: 'Count the asset that could not be posted',
                      config: { assignments: { failed_count: v('failed_count + 1') } },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'set_period' },
    { id: 'e2', source: 'set_period', target: 'get_assets' },
    { id: 'e3', source: 'get_assets', target: 'each_asset' },
    { id: 'e4', source: 'each_asset', target: 'end' },
  ],
});
