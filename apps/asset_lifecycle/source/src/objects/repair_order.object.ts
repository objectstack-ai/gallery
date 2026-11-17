import { P } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const RepairOrder = ObjectSchema.create({
  name: 'demoasset_repair_order',
  label: 'Repair Order',
  pluralLabel: 'Repair Orders',
  icon: 'wrench',
  description: 'A fault reported on an asset. The asset is in repair until the order is completed.',
  nameField: 'name',
  highlightFields: ['name', 'asset', 'issue', 'status', 'cost'],

  fieldGroups: [
    { key: 'fault', label: 'Fault' },
    { key: 'repair', label: 'Repair' },
  ],

  fields: {
    name: Field.text({
      label: 'Repair No.',
      searchable: true,
      maxLength: 40,
      group: 'fault',
      // Numbered by whoever files it; a record saved without one is stamped with the time it was saved.
      defaultValue: { dialect: 'cel', source: "'RO-' + isoDatetime(now()).substring(0, 19)" },
    }),
    asset: Field.lookup('demoasset_asset', {
      label: 'Asset',
      required: true,
      group: 'fault',
      deleteBehavior: 'restrict',
      relatedListTitle: 'Repair Orders',
    }),
    // Mirror of the asset's department, computed when the record is saved, for the department manager's row policy.
    asset_department: Field.lookup('demoasset_department', {
      label: 'Asset Department',
      group: 'fault',
      readonly: true,
      relatedList: false,
      expression: 'record.asset.department',
    }),
    // Holds the asset id while the order is open: its unique index allows one open repair per asset.
    open_asset_key: Field.text({
      label: 'Open Asset Key',
      readonly: true,
      hidden: true,
      expression: "record.status != 'completed' ? record.asset : null",
    }),
    // Optional: a fault can be reported by someone with no employee record
    // (the record's owner still says who filed it).
    reported_by: Field.lookup('demoasset_employee', {
      label: 'Reported By',
      group: 'fault',
      relatedListTitle: 'Repairs Reported',
    }),
    reported_on: Field.date({ label: 'Reported On', required: true, group: 'fault' }),
    issue: Field.textarea({ label: 'Fault', required: true, group: 'fault' }),
    status: Field.select({
      label: 'Status',
      required: true,
      group: 'repair',
      options: [
        { label: 'Open', value: 'open', color: '#dc2626', default: true },
        { label: 'In progress', value: 'in_progress', color: '#d97706' },
        { label: 'Completed', value: 'completed', color: '#16a34a' },
      ],
    }),
    cost: Field.currency({ label: 'Repair Cost', min: 0, group: 'repair' }),
    completed_on: Field.date({
      label: 'Completed On',
      group: 'repair',
      requiredWhen: P`record.status == 'completed'`,
    }),
  },

  indexes: [
    { fields: ['asset', 'status'] },
    { fields: ['open_asset_key'], unique: 'organization' },
    { fields: ['reported_by'] },
    { fields: ['asset_department'] },
  ],

  validations: [
    {
      name: 'repair_asset_not_leaving',
      type: 'script',
      condition: P`record.status != 'completed' && record.asset.status in ['pending_disposal', 'disposed']`,
      message: 'This asset is being scrapped or is already disposed of, so it cannot be sent to repair.',
      events: ['insert'],
      severity: 'error',
    },
    {
      name: 'repair_status_lifecycle',
      type: 'state_machine',
      label: 'Repair Lifecycle',
      field: 'status',
      transitions: { open: ['in_progress', 'completed'], in_progress: ['completed'], completed: [] },
      message: 'A completed repair order cannot be reopened. Open a new one instead.',
      severity: 'error',
    },
    {
      name: 'repair_completed_after_reported',
      type: 'cross_field',
      condition: P`record.completed_on != null && record.reported_on != null && record.completed_on < record.reported_on`,
      message: 'The completion date cannot be before the report date.',
      fields: ['completed_on', 'reported_on'],
      severity: 'error',
    },
  ],

  sharingModel: 'public_read_write',

  enable: { apiEnabled: true, searchable: true, trackHistory: true },
});
