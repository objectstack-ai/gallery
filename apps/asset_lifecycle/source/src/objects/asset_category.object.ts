import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AssetCategory = ObjectSchema.create({
  name: 'demoasset_asset_category',
  label: 'Asset Category',
  pluralLabel: 'Asset Categories',
  icon: 'tags',
  description: 'A class of asset (laptop, monitor, ...) with its useful life and depreciation method.',
  nameField: 'name',

  fieldGroups: [{ key: 'details', label: 'Details' }],

  fields: {
    name: Field.text({ label: 'Name', required: true, searchable: true, maxLength: 120, group: 'details' }),
    useful_life_months: Field.number({
      label: 'Useful Life (months)',
      required: true,
      min: 1,
      precision: 4,
      scale: 0,
      group: 'details',
    }),
    depreciation_method: Field.select({
      label: 'Depreciation Method',
      required: true,
      group: 'details',
      options: [
        { label: 'Straight line', value: 'straight_line', default: true },
        { label: 'None (not depreciated)', value: 'none' },
      ],
      description: 'Straight line spreads the purchase cost evenly over the useful life, with no salvage value.',
    }),
  },

  indexes: [{ fields: ['name'], unique: 'organization' }],

  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true },
});
