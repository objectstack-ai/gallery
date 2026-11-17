import { F, P } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Asset = ObjectSchema.create({
  name: 'demoasset_asset',
  label: 'Asset',
  pluralLabel: 'Assets',
  icon: 'laptop',
  description: 'A fixed asset: registered by category, checked out to employees, repaired, depreciated monthly and finally disposed of.',
  nameField: 'name',
  highlightFields: ['name', 'category', 'department', 'status'],

  fieldGroups: [
    { key: 'identity', label: 'Asset' },
    { key: 'assignment', label: 'Assignment' },
    { key: 'value', label: 'Value' },
  ],

  fields: {
    name: Field.text({ label: 'Asset Tag', required: true, searchable: true, maxLength: 40, group: 'identity' }),
    serial_no: Field.text({ label: 'Serial Number', searchable: true, maxLength: 80, group: 'identity' }),
    category: Field.lookup('demoasset_asset_category', {
      label: 'Category',
      required: true,
      group: 'identity',
      deleteBehavior: 'restrict',
    }),
    department: Field.lookup('demoasset_department', {
      label: 'Owning Department',
      required: true,
      group: 'identity',
      deleteBehavior: 'restrict',
    }),

    status: Field.select({
      label: 'Status',
      required: true,
      group: 'assignment',
      options: [
        { label: 'In stock', value: 'in_stock', color: '#16a34a', default: true },
        { label: 'In use', value: 'in_use', color: '#2563eb' },
        { label: 'In repair', value: 'in_repair', color: '#d97706' },
        { label: 'Pending disposal', value: 'pending_disposal', color: '#9333ea' },
        { label: 'Disposed', value: 'disposed', color: '#6b7280' },
      ],
    }),
    custodian: Field.lookup('demoasset_employee', {
      label: 'Custodian',
      group: 'assignment',
      relatedListTitle: 'Assets Held',
      description: 'The employee holding the asset. Set by a checkout and cleared by a return.',
    }),

    purchase_date: Field.date({ label: 'Purchase Date', required: true, group: 'value' }),
    purchase_cost: Field.currency({ label: 'Purchase Cost', required: true, min: 0, group: 'value' }),
    accumulated_depreciation: Field.summary({
      label: 'Accumulated Depreciation',
      group: 'value',
      summaryOperations: {
        object: 'demoasset_depreciation_entry',
        field: 'amount',
        function: 'sum',
        relationshipField: 'asset',
      },
    }),
    book_value: Field.currency({
      label: 'Book Value',
      group: 'value',
      readonly: true,
      expression: F`record.purchase_cost - coalesce(record.accumulated_depreciation, 0)`,
      description: 'Purchase cost minus accumulated depreciation. Zero once the asset is disposed of: the disposal posts the remainder as a write-off entry.',
    }),
    disposed_on: Field.date({ label: 'Disposed On', group: 'value', readonly: true }),
  },

  indexes: [
    { fields: ['name'], unique: 'organization' },
    { fields: ['status'] },
    { fields: ['department'] },
    { fields: ['custodian'] },
  ],

  validations: [
    {
      name: 'asset_status_lifecycle',
      type: 'state_machine',
      label: 'Asset Lifecycle',
      field: 'status',
      // No `initialStates`: an existing register is loaded with assets already in use.
      transitions: {
        in_stock: ['in_use', 'in_repair', 'pending_disposal'],
        in_use: ['in_stock', 'in_repair', 'pending_disposal'],
        in_repair: ['in_stock', 'pending_disposal'],
        pending_disposal: ['in_stock', 'disposed'],
        disposed: [], // a disposal cannot be undone
      },
      message: 'This status change is not allowed. A disposed asset stays disposed.',
      severity: 'error',
    },
    {
      name: 'asset_custodian_only_in_use',
      type: 'script',
      condition: P`record.status != 'in_use' && !isBlank(record.custodian)`,
      message: 'Only an asset in use has a custodian.',
      severity: 'warning',
    },
    {
      name: 'asset_in_use_needs_custodian',
      type: 'script',
      condition: P`record.status == 'in_use' && isBlank(record.custodian)`,
      message: 'An asset in use needs a custodian. Check it out to an employee.',
      severity: 'error',
    },
  ],

  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true, trackHistory: true },
});
