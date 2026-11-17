import { P } from '@objectstack/spec';
import { defineAction } from '@objectstack/spec/ui';

// The app's business actions. Each is a button in the Console and, through
// `ai.exposed`, a tool an AI agent may call (`run_action` over MCP). All of
// them start a flow that runs as the caller, so a caller can do through an
// action exactly what their permission set lets them do, and nothing more.

export const CheckOutAssetsAction = defineAction({
  name: 'demoasset_check_out_assets',
  label: 'Check Out Assets',
  objectName: 'demoasset_checkout',
  icon: 'log-out',
  type: 'flow',
  target: 'check_out_assets',
  locations: ['list_toolbar'],
  description: 'Check one or more in-stock assets out to an employee. Leave the due date empty for a permanent assignment.',
  params: [
    {
      name: 'assets',
      label: 'Assets',
      type: 'lookup',
      reference: 'demoasset_asset',
      multiple: true,
      required: true,
      helpText: 'Only assets in stock can be checked out.',
    },
    { field: 'employee', required: true },
    { field: 'checked_out_on', helpText: 'Defaults to today.' },
    { field: 'due_on' },
  ],
  submitText: 'Check out',
  requiredPermissions: ['demoasset.manage_assets'],
  successMessage: 'Assets checked out.',
  refreshAfter: true,
  ai: {
    exposed: true,
    description:
      'Check one or more in-stock assets out to an employee. Params: assets (list of asset ids, all must be in stock), ' +
      'employee (employee id), checked_out_on (date, defaults to today), due_on (date; omit for a permanent assignment). ' +
      'Each asset becomes in use with the employee as its custodian. Refused when any chosen asset is not in stock.',
  },
});

export const CheckInAssetAction = defineAction({
  name: 'demoasset_check_in_asset',
  label: 'Check In',
  objectName: 'demoasset_checkout',
  icon: 'log-in',
  type: 'flow',
  target: 'check_in_asset',
  locations: ['record_header', 'list_item'],
  visible: P`has(record.status) && record.status == 'open'`,
  description: 'Return the asset of {{ record.name }} and record its condition.',
  params: [
    { field: 'asset', defaultFromRow: true, helpText: 'The asset being returned.' },
    { field: 'returned_on', helpText: 'Defaults to today.' },
    { field: 'return_condition', required: true, defaultValue: 'good' },
  ],
  submitText: 'Check in',
  requiredPermissions: ['demoasset.manage_assets'],
  successMessage: 'Asset returned.',
  refreshAfter: true,
  ai: {
    exposed: true,
    description:
      'Return an asset: close its open checkout and record its condition. Pass recordId (the checkout id) or the param ' +
      'asset (the asset id, to close its open checkout). Params: return_condition (good or damaged), returned_on (date, ' +
      'defaults to today). The asset loses its custodian and is back in stock.',
  },
});

export const OpenRepairOrderAction = defineAction({
  name: 'demoasset_open_repair_order',
  label: 'Report a Fault',
  objectName: 'demoasset_repair_order',
  icon: 'wrench',
  type: 'flow',
  target: 'open_repair_order',
  locations: ['list_toolbar'],
  description: 'Report a fault on an asset. A repair order is opened and the asset is in repair until it is fixed.',
  params: [
    { field: 'asset', required: true },
    { field: 'issue', required: true },
    { field: 'reported_on', helpText: 'Defaults to today.' },
    { field: 'reported_by', helpText: 'Defaults to you.' },
  ],
  submitText: 'Send to repair',
  successMessage: 'Repair order opened.',
  refreshAfter: true,
  ai: {
    exposed: true,
    description:
      'Report a fault on an asset and send it to repair. Params: asset (asset id), issue (what is wrong, text), ' +
      'reported_on (date, defaults to today), reported_by (employee id; defaults to the caller\'s own employee record). ' +
      'Opens a repair order; the asset is returned if checked out and is in repair until the order is completed.',
  },
});

export const RequestScrapAction = defineAction({
  name: 'demoasset_request_scrap',
  label: 'Request Scrap',
  objectName: 'demoasset_disposal_request',
  icon: 'trash-2',
  type: 'flow',
  target: 'request_scrap',
  locations: ['list_toolbar'],
  description: "Ask to scrap an asset. The manager of the asset's department decides the request.",
  params: [
    { field: 'asset', required: true },
    { field: 'reason', required: true },
    { field: 'requested_by', helpText: 'Defaults to you.' },
  ],
  submitText: 'Send request',
  successMessage: 'Scrap request sent to the department manager.',
  refreshAfter: true,
  ai: {
    exposed: true,
    description:
      'Ask to scrap an asset. Params: asset (asset id), reason (why it should be scrapped, text), requested_by (employee ' +
      "id; defaults to the caller's own employee record). Files a scrap request that the manager of the asset's " +
      'department must approve or reject; the asset is pending disposal meanwhile. This does not dispose of the asset.',
  },
});

export const DecideScrapRequestAction = defineAction({
  name: 'demoasset_decide_scrap_request',
  label: 'Decide',
  objectName: 'demoasset_disposal_request',
  icon: 'gavel',
  type: 'flow',
  target: 'decide_scrap_request',
  execution: 'perRecord',
  locations: ['record_header', 'list_item'],
  visible: P`has(record.status) && record.status == 'submitted'`,
  description: 'Approve or reject {{ record.name }}. A decision cannot be changed afterwards.',
  params: [
    {
      name: 'decision',
      label: 'Decision',
      type: 'select',
      required: true,
      options: [
        { label: 'Approve', value: 'approved' },
        { label: 'Reject', value: 'rejected' },
      ],
    },
  ],
  submitText: 'Record decision',
  requiredPermissions: ['demoasset.decide_scrap'],
  successMessage: 'Decision recorded.',
  refreshAfter: true,
  ai: {
    exposed: true,
    description:
      'Approve or reject a submitted scrap request that the signed-in manager holds as its approver. Pass recordId (the ' +
      'scrap request id) and the param decision: "approved" or "rejected". Records the decision date on the request. ' +
      'Refused for anyone who is not the approver, and for a request that is already decided.',
  },
});

export const DisposeAssetAction = defineAction({
  name: 'demoasset_dispose_asset',
  label: 'Dispose of Asset',
  objectName: 'demoasset_disposal_request',
  icon: 'flame',
  type: 'flow',
  target: 'dispose_asset',
  execution: 'perRecord',
  variant: 'danger',
  locations: ['record_header', 'list_item'],
  visible: P`has(record.status) && record.status == 'approved'`,
  confirmText:
    'Dispose of the asset of {{ record.name }}? Its remaining book value is written off and its depreciation stops. This cannot be undone.',
  requiredPermissions: ['demoasset.manage_assets'],
  successMessage: 'Asset disposed of and written off.',
  refreshAfter: true,
  ai: {
    exposed: true,
    requiresConfirmation: true,
    description:
      'Dispose of the asset of an APPROVED scrap request and write off its remaining book value. Pass recordId (the ' +
      'scrap request id). IRREVERSIBLE: the asset becomes disposed for good and its depreciation stops. Always ask the ' +
      'person to confirm before calling. Refused unless the request is approved.',
  },
});

export const RequestTransferAction = defineAction({
  name: 'demoasset_request_transfer',
  label: 'Transfer Asset',
  objectName: 'demoasset_asset_transfer',
  icon: 'arrow-left-right',
  type: 'flow',
  target: 'request_transfer',
  locations: ['list_toolbar'],
  description: 'Ask to move an asset to another department. The manager of the receiving department decides the transfer.',
  params: [
    { field: 'asset', required: true },
    { field: 'to_department', required: true },
    { field: 'reason', required: true },
    { field: 'requested_by', helpText: 'Defaults to you.' },
  ],
  submitText: 'Send request',
  requiredPermissions: ['demoasset.manage_assets'],
  successMessage: 'Transfer sent to the receiving manager.',
  refreshAfter: true,
  ai: {
    exposed: true,
    description:
      'Ask to move an asset to another department. Params: asset (asset id), to_department (id of the receiving ' +
      'department), reason (why it should move, text), requested_by (employee id; defaults to the caller\'s own employee ' +
      'record). Files a transfer that the manager of the receiving department must approve or reject; the asset stays ' +
      'with its current department until it is approved. Refused for a disposed asset, for the department the asset ' +
      'already belongs to, and while the asset has another pending transfer.',
  },
});

export const DecideTransferAction = defineAction({
  name: 'demoasset_decide_asset_transfer',
  label: 'Decide',
  objectName: 'demoasset_asset_transfer',
  icon: 'gavel',
  type: 'flow',
  target: 'decide_asset_transfer',
  execution: 'perRecord',
  locations: ['record_header', 'list_item'],
  visible: P`has(record.status) && record.status == 'submitted'`,
  description: 'Approve or reject {{ record.name }}. Approving it moves the asset to your department; a decision cannot be changed afterwards.',
  params: [
    {
      name: 'decision',
      label: 'Decision',
      type: 'select',
      required: true,
      options: [
        { label: 'Approve', value: 'approved' },
        { label: 'Reject', value: 'rejected' },
      ],
    },
  ],
  submitText: 'Record decision',
  requiredPermissions: ['demoasset.decide_transfer'],
  successMessage: 'Decision recorded.',
  refreshAfter: true,
  ai: {
    exposed: true,
    description:
      'Approve or reject a submitted asset transfer that the signed-in manager holds as its approver (they manage the ' +
      'receiving department). Pass recordId (the transfer id) and the param decision: "approved" or "rejected". ' +
      'Approving moves the asset to the receiving department. Refused for anyone who is not the approver, and for a ' +
      'transfer that is already decided or cancelled.',
  },
});

export const CancelTransferAction = defineAction({
  name: 'demoasset_cancel_asset_transfer',
  label: 'Cancel Transfer',
  objectName: 'demoasset_asset_transfer',
  icon: 'x',
  type: 'flow',
  target: 'cancel_asset_transfer',
  execution: 'perRecord',
  locations: ['record_header', 'list_item'],
  visible: P`has(record.status) && record.status == 'submitted'`,
  confirmText: 'Cancel {{ record.name }}? The asset stays with its current department.',
  requiredPermissions: ['demoasset.manage_assets'],
  successMessage: 'Transfer cancelled.',
  refreshAfter: true,
  ai: {
    exposed: true,
    description:
      'Withdraw an asset transfer that is still awaiting its decision. Pass recordId (the transfer id). The asset stays ' +
      'with its current department. Refused once the transfer is decided.',
  },
});
