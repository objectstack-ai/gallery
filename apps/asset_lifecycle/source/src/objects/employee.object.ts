import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Employee = ObjectSchema.create({
  name: 'demoasset_employee',
  label: 'Employee',
  pluralLabel: 'Employees',
  icon: 'user',
  description: 'A person assets are checked out to. Linked to the platform user who signs in as them.',
  nameField: 'name',
  highlightFields: ['name', 'title', 'department'],

  fieldGroups: [
    { key: 'details', label: 'Details' },
    { key: 'shipping', label: 'Shipping' },
  ],

  fields: {
    name: Field.text({ label: 'Name', required: true, searchable: true, maxLength: 120, group: 'details' }),
    // Optional: closes the department <-> employee reference cycle.
    department: Field.lookup('demoasset_department', { label: 'Department', group: 'details' }),
    title: Field.text({ label: 'Title', maxLength: 120, group: 'details' }),
    user: Field.user({
      label: 'User',
      group: 'details',
      description: 'The platform user who signs in as this employee. Empty for an employee who does not sign in.',
    }),
    home_address: Field.textarea({
      label: 'Home Address',
      group: 'shipping',
      description: 'Used to ship equipment. Visible to the asset administrator only.',
    }),
  },

  // The sets a row policy reads as `current_user.<key>`:
  //  - my_employee_ids: the employee rows the caller is ("the records I am");
  //  - my_department_ids: the department(s) of those rows.
  membershipKeys: {
    my_employee_ids: { userField: 'user', valueField: 'id' },
    my_department_ids: { userField: 'user', valueField: 'department' },
  },

  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true, trackHistory: true },
});
