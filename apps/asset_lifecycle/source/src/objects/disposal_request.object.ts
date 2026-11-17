import { P } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const DisposalRequest = ObjectSchema.create({
  name: 'demoasset_disposal_request',
  label: 'Scrap Request',
  pluralLabel: 'Scrap Requests',
  icon: 'trash-2',
  description: 'A request to scrap an asset. The manager of the asset\'s department decides it; once approved, the asset administrator disposes of the asset.',
  nameField: 'name',
  highlightFields: ['name', 'asset', 'status', 'requested_by'],

  fieldGroups: [
    { key: 'request', label: 'Request' },
    { key: 'decision', label: 'Decision' },
    { key: 'disposal', label: 'Disposal' },
  ],

  fields: {
    name: Field.text({
      label: 'Request No.',
      searchable: true,
      maxLength: 40,
      group: 'request',
      // Numbered by whoever files it; a record saved without one is stamped with the time it was saved.
      defaultValue: { dialect: 'cel', source: "'DR-' + isoDatetime(now()).substring(0, 19)" },
    }),
    asset: Field.lookup('demoasset_asset', {
      label: 'Asset',
      required: true,
      group: 'request',
      deleteBehavior: 'restrict',
      relatedListTitle: 'Scrap Requests',
    }),
    // Mirror of the asset's department, computed when the record is saved, for the department manager's row policy.
    asset_department: Field.lookup('demoasset_department', {
      label: 'Asset Department',
      group: 'request',
      readonly: true,
      relatedList: false,
      expression: 'record.asset.department',
    }),
    // Holds the asset id while the request is undecided or approved: its unique
    // index allows one live scrap request per asset.
    open_asset_key: Field.text({
      label: 'Open Asset Key',
      readonly: true,
      hidden: true,
      expression: "record.status in ['submitted', 'approved'] ? record.asset : null",
    }),
    // Optional: a request can be filed by someone with no employee record
    // (the record's owner still says who filed it).
    requested_by: Field.lookup('demoasset_employee', {
      label: 'Requested By',
      group: 'request',
      relatedListTitle: 'Scrap Requests Filed',
    }),
    requested_on: Field.date({ label: 'Requested On', required: true, group: 'request' }),
    reason: Field.textarea({ label: 'Reason', required: true, group: 'request' }),

    approver: Field.lookup('demoasset_employee', {
      label: 'Approver',
      group: 'decision',
      relatedListTitle: 'Scrap Requests to Decide',
      description: 'The manager of the asset\'s department. Filled in when the request is filed.',
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      group: 'decision',
      options: [
        { label: 'Submitted', value: 'submitted', color: '#2563eb', default: true },
        { label: 'Approved', value: 'approved', color: '#16a34a' },
        { label: 'Rejected', value: 'rejected', color: '#dc2626' },
        { label: 'Completed', value: 'completed', color: '#6b7280' },
      ],
    }),
    decided_on: Field.date({
      label: 'Decided On',
      group: 'decision',
      requiredWhen: P`record.status in ['approved', 'rejected', 'completed']`,
    }),

    disposed_on: Field.date({
      label: 'Disposed On',
      group: 'disposal',
      requiredWhen: P`record.status == 'completed'`,
    }),
    written_off_amount: Field.currency({
      label: 'Written Off',
      group: 'disposal',
      readonly: true,
      description: 'The asset\'s remaining book value, written off at disposal.',
    }),
  },

  indexes: [
    { fields: ['asset', 'status'] },
    { fields: ['open_asset_key'], unique: 'organization' },
    { fields: ['requested_by'] },
    { fields: ['approver'] },
    { fields: ['asset_department'] },
  ],

  validations: [
    {
      name: 'scrap_asset_not_disposed',
      type: 'script',
      condition: P`record.status == 'submitted' && record.asset.status == 'disposed'`,
      message: 'This asset is already disposed of.',
      events: ['insert'],
      severity: 'error',
    },
    {
      name: 'scrap_status_lifecycle',
      type: 'state_machine',
      label: 'Scrap Request Lifecycle',
      field: 'status',
      transitions: {
        submitted: ['approved', 'rejected'],
        approved: ['completed'],
        rejected: [],
        completed: [], // a disposal cannot be undone
      },
      message: 'A scrap request goes Submitted, then Approved or Rejected, then (once approved) Completed. A decision or a disposal cannot be undone.',
      severity: 'error',
    },
    {
      name: 'scrap_decided_needs_approver',
      type: 'script',
      condition: P`record.status in ['approved', 'rejected', 'completed'] && isBlank(record.approver)`,
      message: 'A decided scrap request names the approver who decided it.',
      severity: 'error',
    },
    {
      name: 'scrap_undecided_has_no_decision_date',
      type: 'script',
      condition: P`record.status == 'submitted' && record.decided_on != null`,
      message: 'A submitted scrap request has no decision date yet.',
      severity: 'warning',
    },
    {
      name: 'scrap_disposed_only_when_completed',
      type: 'script',
      condition: P`record.status != 'completed' && record.disposed_on != null`,
      message: 'Only a completed scrap request has a disposal date.',
      severity: 'warning',
    },
  ],

  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true, trackHistory: true },
});
