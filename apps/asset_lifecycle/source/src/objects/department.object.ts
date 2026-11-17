import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Department = ObjectSchema.create({
  name: 'demoasset_department',
  label: 'Department',
  pluralLabel: 'Departments',
  icon: 'building-2',
  description: 'An owning department. Its manager decides the scrap requests of its assets and the transfers of assets into it.',
  nameField: 'name',

  fieldGroups: [
    { key: 'details', label: 'Details' },
    { key: 'budget', label: 'Budget' },
  ],

  fields: {
    name: Field.text({ label: 'Name', required: true, searchable: true, maxLength: 120, group: 'details' }),
    // Optional: closes the department <-> employee reference cycle.
    manager: Field.lookup('demoasset_employee', {
      label: 'Manager',
      group: 'details',
      relatedListTitle: 'Managed Departments',
    }),
    asset_budget: Field.currency({
      label: 'Asset Budget',
      group: 'budget',
      min: 0,
      description: 'Yearly budget for fixed assets. Hidden from employees and from the asset administrator.',
    }),
  },

  indexes: [{ fields: ['name'], unique: 'organization' }],

  // Every signed-in role reads this object only through a permission set; the
  // department manager's set narrows the rows to their own department.
  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true, trackHistory: true },
});
