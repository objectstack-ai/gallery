import { P } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Checkout = ObjectSchema.create({
  name: 'demoasset_checkout',
  label: 'Checkout',
  pluralLabel: 'Checkouts',
  icon: 'arrow-right-left',
  description: 'An asset handed to an employee. Open until the asset is returned.',
  nameField: 'name',
  highlightFields: ['name', 'asset', 'employee', 'checked_out_on', 'status'],

  fieldGroups: [
    { key: 'checkout', label: 'Checkout' },
    { key: 'return', label: 'Return' },
  ],

  fields: {
    name: Field.text({
      label: 'Checkout No.',
      searchable: true,
      maxLength: 40,
      group: 'checkout',
      // Numbered by whoever files it; a record saved without one is stamped with the time it was saved.
      defaultValue: { dialect: 'cel', source: "'CO-' + isoDatetime(now()).substring(0, 19)" },
    }),
    asset: Field.lookup('demoasset_asset', {
      label: 'Asset',
      required: true,
      group: 'checkout',
      deleteBehavior: 'restrict',
      relatedListTitle: 'Checkouts',
    }),
    employee: Field.lookup('demoasset_employee', {
      label: 'Employee',
      required: true,
      group: 'checkout',
      deleteBehavior: 'restrict',
      relatedListTitle: 'Checkouts',
    }),
    // Mirror of the employee's department, computed when the record is saved: a
    // department manager's row policy matches it (a policy cannot hop through a lookup).
    employee_department: Field.lookup('demoasset_department', {
      label: 'Employee Department',
      group: 'checkout',
      readonly: true,
      relatedList: false,
      expression: 'record.employee.department',
    }),
    // Holds the asset id while the checkout is open: its unique index allows one open checkout per asset.
    open_asset_key: Field.text({
      label: 'Open Asset Key',
      readonly: true,
      hidden: true,
      expression: "record.status == 'open' ? record.asset : null",
    }),
    checked_out_on: Field.date({ label: 'Checked Out On', required: true, group: 'checkout' }),
    due_on: Field.date({
      label: 'Due On',
      group: 'checkout',
      description: 'Leave empty for a permanent assignment.',
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      group: 'return',
      options: [
        { label: 'Open', value: 'open', color: '#2563eb', default: true },
        { label: 'Returned', value: 'returned', color: '#16a34a' },
      ],
    }),
    returned_on: Field.date({
      label: 'Returned On',
      group: 'return',
      requiredWhen: P`record.status == 'returned'`,
    }),
    return_condition: Field.select({
      label: 'Condition on Return',
      group: 'return',
      requiredWhen: P`record.status == 'returned'`,
      options: [
        { label: 'Good', value: 'good', color: '#16a34a' },
        { label: 'Damaged', value: 'damaged', color: '#dc2626' },
      ],
    }),
  },

  indexes: [
    { fields: ['asset', 'status'] },
    { fields: ['open_asset_key'], unique: 'organization' },
    { fields: ['employee'] },
    { fields: ['employee_department'] },
  ],

  validations: [
    {
      // Only an asset in stock can be checked out. The one exception records an
      // assignment the register already shows (loading an existing register):
      // the asset is in use by this same employee. The unique `open_asset_key`
      // index still refuses a second open checkout of that asset.
      name: 'checkout_asset_in_stock',
      type: 'script',
      condition: P`record.status == 'open' && !(record.asset.status == 'in_stock' || (record.asset.status == 'in_use' && record.asset.custodian == record.employee))`,
      message: 'Only an asset in stock can be checked out. Return, repair or release this asset first.',
      events: ['insert'],
      severity: 'error',
    },
    {
      name: 'checkout_status_lifecycle',
      type: 'state_machine',
      label: 'Checkout Lifecycle',
      field: 'status',
      transitions: { open: ['returned'], returned: [] },
      message: 'A returned checkout cannot be reopened. Check the asset out again instead.',
      severity: 'error',
    },
    {
      name: 'checkout_due_after_checkout',
      type: 'cross_field',
      condition: P`record.due_on != null && record.checked_out_on != null && record.due_on < record.checked_out_on`,
      message: 'The due date cannot be before the checkout date.',
      fields: ['due_on', 'checked_out_on'],
      severity: 'error',
    },
    {
      name: 'checkout_return_after_checkout',
      type: 'cross_field',
      condition: P`record.returned_on != null && record.checked_out_on != null && record.returned_on < record.checked_out_on`,
      message: 'The return date cannot be before the checkout date.',
      fields: ['returned_on', 'checked_out_on'],
      severity: 'error',
    },
    {
      name: 'checkout_open_has_no_return',
      type: 'script',
      condition: P`record.status == 'open' && (record.returned_on != null || !isBlank(record.return_condition))`,
      message: 'An open checkout has no return date or condition. Set the status to Returned to record a return.',
      severity: 'warning',
    },
  ],

  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true, trackHistory: true },
});
