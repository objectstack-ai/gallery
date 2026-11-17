import { P } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AssetTransfer = ObjectSchema.create({
  name: 'demoasset_asset_transfer',
  label: 'Asset Transfer',
  pluralLabel: 'Asset Transfers',
  icon: 'arrow-left-right',
  description:
    'A request to move an asset to another department. The manager of the receiving department decides it; once approved, the asset belongs to that department.',
  nameField: 'name',
  highlightFields: ['name', 'asset', 'to_department', 'status'],

  fieldGroups: [
    { key: 'request', label: 'Request' },
    { key: 'decision', label: 'Decision' },
  ],

  fields: {
    name: Field.text({
      label: 'Transfer No.',
      searchable: true,
      maxLength: 40,
      group: 'request',
      // Numbered by whoever files it; a record saved without one is stamped with the time it was saved.
      defaultValue: { dialect: 'cel', source: "'TR-' + isoDatetime(now()).substring(0, 19)" },
    }),
    asset: Field.lookup('demoasset_asset', {
      label: 'Asset',
      required: true,
      group: 'request',
      deleteBehavior: 'restrict',
      relatedListTitle: 'Transfers',
    }),
    // The asset's tag, copied when the transfer is filed: the receiving
    // manager cannot read an asset that is not in their department yet.
    asset_tag: Field.text({ label: 'Asset Tag', group: 'request', readonly: true, maxLength: 40 }),
    // The department the asset left, copied when the transfer is filed (the
    // asset's own department changes once the transfer is approved).
    from_department: Field.lookup('demoasset_department', {
      label: 'From Department',
      group: 'request',
      readonly: true,
      relatedListTitle: 'Transfers Out',
    }),
    to_department: Field.lookup('demoasset_department', {
      label: 'To Department',
      required: true,
      group: 'request',
      deleteBehavior: 'restrict',
      relatedListTitle: 'Transfers In',
    }),
    // Holds the asset id while the transfer is undecided: its unique index
    // allows one pending transfer per asset.
    open_asset_key: Field.text({
      label: 'Open Asset Key',
      readonly: true,
      hidden: true,
      expression: "record.status == 'submitted' ? record.asset : null",
    }),
    // Optional: a transfer can be filed by someone with no employee record
    // (the record's owner still says who filed it).
    requested_by: Field.lookup('demoasset_employee', {
      label: 'Requested By',
      group: 'request',
      relatedListTitle: 'Transfers Filed',
    }),
    requested_on: Field.date({ label: 'Requested On', required: true, group: 'request' }),
    reason: Field.textarea({ label: 'Reason', required: true, group: 'request' }),

    approver: Field.lookup('demoasset_employee', {
      label: 'Approver',
      group: 'decision',
      relatedListTitle: 'Transfers to Decide',
      description: 'The manager of the receiving department. Filled in when the transfer is filed.',
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      group: 'decision',
      options: [
        { label: 'Submitted', value: 'submitted', color: '#2563eb', default: true },
        { label: 'Approved', value: 'approved', color: '#16a34a' },
        { label: 'Rejected', value: 'rejected', color: '#dc2626' },
        { label: 'Cancelled', value: 'cancelled', color: '#6b7280' },
      ],
    }),
    decided_on: Field.date({
      label: 'Decided On',
      group: 'decision',
      requiredWhen: P`record.status in ['approved', 'rejected']`,
    }),
  },

  indexes: [
    { fields: ['asset', 'status'] },
    { fields: ['open_asset_key'], unique: 'organization' },
    { fields: ['from_department'] },
    { fields: ['to_department'] },
    { fields: ['approver'] },
  ],

  validations: [
    {
      name: 'transfer_asset_not_disposed',
      type: 'script',
      condition: P`record.status in ['submitted', 'approved'] && record.asset.status == 'disposed'`,
      message: 'A disposed asset cannot be transferred.',
      severity: 'error',
    },
    {
      name: 'transfer_to_another_department',
      type: 'script',
      condition: P`record.status == 'submitted' && record.to_department == record.asset.department`,
      message: 'The asset already belongs to that department. Choose another department to transfer it to.',
      events: ['insert'],
      severity: 'error',
    },
    {
      name: 'transfer_status_lifecycle',
      type: 'state_machine',
      label: 'Asset Transfer Lifecycle',
      field: 'status',
      transitions: {
        submitted: ['approved', 'rejected', 'cancelled'],
        approved: [], // the asset has moved; move it back with a new transfer
        rejected: [],
        cancelled: [],
      },
      message: 'A transfer goes Submitted, then Approved, Rejected or Cancelled. A decision cannot be undone: file a new transfer instead.',
      severity: 'error',
    },
    {
      name: 'transfer_decided_needs_approver',
      type: 'script',
      condition: P`record.status in ['approved', 'rejected'] && isBlank(record.approver)`,
      message: 'A decided transfer names the approver who decided it.',
      severity: 'error',
    },
    {
      name: 'transfer_undecided_has_no_decision_date',
      type: 'script',
      condition: P`record.status == 'submitted' && record.decided_on != null`,
      message: 'A submitted transfer has no decision date yet.',
      severity: 'warning',
    },
  ],

  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true, trackHistory: true },
});
