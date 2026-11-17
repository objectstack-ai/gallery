import { ObjectSchema, Field } from '@objectstack/spec/data';

export const DepreciationEntry = ObjectSchema.create({
  name: 'demoasset_depreciation_entry',
  label: 'Depreciation Entry',
  pluralLabel: 'Depreciation Entries',
  icon: 'trending-down',
  description: 'One month of depreciation posted for one asset (or the write-off posted at its disposal). An asset\'s accumulated depreciation sums these.',
  nameField: 'period',
  highlightFields: ['period', 'asset', 'amount', 'kind'],

  fieldGroups: [{ key: 'entry', label: 'Entry' }],

  fields: {
    asset: Field.lookup('demoasset_asset', {
      label: 'Asset',
      required: true,
      group: 'entry',
      deleteBehavior: 'restrict',
      relatedListTitle: 'Depreciation Entries',
    }),
    // Mirror of the asset's department, computed when the record is saved, for the department manager's row policy.
    asset_department: Field.lookup('demoasset_department', {
      label: 'Asset Department',
      group: 'entry',
      readonly: true,
      relatedList: false,
      expression: 'record.asset.department',
    }),
    period: Field.text({
      label: 'Period',
      required: true,
      searchable: true,
      maxLength: 7,
      group: 'entry',
      description: 'The month depreciated, as YYYY-MM.',
    }),
    kind: Field.select({
      label: 'Kind',
      required: true,
      group: 'entry',
      options: [
        { label: 'Monthly depreciation', value: 'depreciation', default: true },
        { label: 'Disposal write-off', value: 'write_off' },
      ],
      description: 'A write-off is the remaining book value posted when the asset is disposed of.',
    }),
    posted_on: Field.date({ label: 'Posted On', required: true, group: 'entry' }),
    amount: Field.currency({ label: 'Amount', required: true, min: 0, group: 'entry' }),
  },

  indexes: [
    // One entry of each kind per asset and month: posting a month twice is refused.
    { fields: ['asset', 'period', 'kind'], unique: 'organization' },
    { fields: ['asset_department'] },
  ],

  validations: [
    {
      name: 'depreciation_period_format',
      type: 'format',
      field: 'period',
      regex: '^\\d{4}-(0[1-9]|1[0-2])$',
      message: 'Period must be a month written as YYYY-MM, for example 2026-07.',
      severity: 'error',
    },
  ],

  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true },
});
