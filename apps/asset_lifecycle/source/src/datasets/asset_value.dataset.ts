import { defineDataset } from '@objectstack/spec/ui';

/**
 * The asset register as an analytics dataset: how many assets there are and
 * what they are worth, by category, department and status. Read under the
 * caller's own row and field security, so a department manager's totals cover
 * their department only.
 */
export const AssetValueDataset = defineDataset({
  name: 'asset_value',
  label: 'Asset Value',
  description: 'Asset count, purchase cost, accumulated depreciation and book value of the asset register.',
  object: 'demoasset_asset',
  dimensions: [
    { name: 'category', label: 'Category', field: 'category', synonyms: ['asset category', 'type'] },
    { name: 'department', label: 'Department', field: 'department', synonyms: ['owning department'] },
    { name: 'status', label: 'Status', field: 'status' },
    { name: 'purchase_date', label: 'Purchase Date', field: 'purchase_date', type: 'date', dateGranularity: 'month' },
  ],
  measures: [
    {
      name: 'asset_count',
      label: 'Assets',
      aggregate: 'count',
      description: 'Number of assets in the register, disposed ones included (group or filter by status to separate them).',
      synonyms: ['number of assets', 'asset count'],
    },
    {
      name: 'purchase_cost_sum',
      label: 'Purchase Cost',
      aggregate: 'sum',
      field: 'purchase_cost',
      format: '0,0.00',
      description: 'Total purchase cost.',
    },
    {
      name: 'accumulated_depreciation_sum',
      label: 'Accumulated Depreciation',
      aggregate: 'sum',
      field: 'accumulated_depreciation',
      format: '0,0.00',
      polarity: 'neutral',
      description: 'Total depreciation posted so far.',
    },
    {
      name: 'book_value_sum',
      label: 'Book Value',
      aggregate: 'sum',
      field: 'book_value',
      format: '0,0.00',
      description: 'Total book value: purchase cost minus accumulated depreciation. A disposal writes the remainder off.',
      synonyms: ['net book value', 'asset value'],
    },
  ],
});
