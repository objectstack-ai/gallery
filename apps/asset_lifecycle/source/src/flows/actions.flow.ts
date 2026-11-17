import { defineFlow } from '@objectstack/spec';
import { v } from './_cel.js';

// The flows behind the app's business actions. Each runs as the signed-in user
// (`runAs: 'user'`), so the user's own object permissions and row policies
// decide what it may read and write; the asset lifecycle itself (status,
// custodian, write-off) is carried by the record-change flows, which fire on
// the writes made here exactly as they do on a write through any other door.

const refuse = (id: string, label: string, message: string) => ({
  id,
  type: 'end' as const,
  label,
  config: { outcome: 'refused' as const, message },
});

const TODAY = 'isoDate(today())';

/** The employee record of the signed-in user, bound to `me` (null when the user has none). */
const getMeNode = {
  id: 'get_me',
  type: 'get_record' as const,
  label: 'Find my employee record',
  config: {
    objectName: 'demoasset_employee',
    filter: { user: v('current_user.id') },
    outputVariable: 'me',
  },
};

// ───────────────────────────── Check out ─────────────────────────────

const HAS_CHECKOUT_INPUT = 'assets != null && size(assets) > 0 && employee != null';
const ALL_IN_STOCK = 'size(in_stock_assets) == size(assets)';

export const CheckOutAssetsFlow = defineFlow({
  name: 'check_out_assets',
  label: 'Check out assets',
  description: 'Checks one or more in-stock assets out to an employee: one open checkout per asset.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  requiredPermissions: ['demoasset.manage_assets'],
  variables: [
    { name: 'assets', type: 'list', isInput: true, defaultValue: [] },
    { name: 'employee', type: 'text', isInput: true, defaultValue: null },
    { name: 'checked_out_on', type: 'text', isInput: true, defaultValue: null },
    { name: 'due_on', type: 'text', isInput: true, defaultValue: null },
    { name: 'in_stock_count', type: 'number', defaultValue: 0 },
    { name: 'chosen_count', type: 'number', defaultValue: 0 },
    { name: 'checked_out_count', type: 'number', isOutput: true, defaultValue: 0 },
    { name: 'failed_count', type: 'number', isOutput: true, defaultValue: 0 },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'has_input', type: 'decision', label: 'Assets and employee given?' },
    refuse('no_input', 'Nothing to check out', 'Choose at least one asset and the employee to check it out to.'),
    {
      id: 'get_in_stock',
      type: 'get_record',
      label: 'Which of the chosen assets are in stock?',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: { $in: v('assets') }, status: 'in_stock' },
        limit: 1000,
        outputVariable: 'in_stock_assets',
      },
    },
    {
      id: 'count_in_stock',
      type: 'assignment',
      label: 'Count them',
      config: { assignments: { in_stock_count: v('size(in_stock_assets)'), chosen_count: v('size(assets)') } },
    },
    { id: 'all_in_stock', type: 'decision', label: 'All in stock?' },
    refuse(
      'not_in_stock',
      'Not all in stock',
      'Only an asset in stock can be checked out. {{ in_stock_count }} of the {{ chosen_count }} chosen assets are in stock; nothing was checked out.',
    ),
    {
      id: 'each_asset',
      type: 'loop',
      label: 'For each asset',
      config: {
        collection: v('in_stock_assets'),
        iteratorVariable: 'item',
        maxIterations: 1000,
        body: {
          nodes: [
            {
              id: 'check_out_one',
              type: 'try_catch',
              label: 'Check this asset out',
              config: {
                try: {
                  nodes: [
                    {
                      id: 'create_checkout',
                      type: 'create_record',
                      label: 'Open a checkout',
                      config: {
                        objectName: 'demoasset_checkout',
                        fields: {
                          name: v(`'CO-' + ${TODAY} + '-' + item.name`),
                          asset: v('item.id'),
                          employee: v('employee'),
                          checked_out_on: v(`checked_out_on != null ? checked_out_on : ${TODAY}`),
                          due_on: v('due_on'),
                          status: 'open',
                        },
                      },
                    },
                    {
                      id: 'count_one',
                      type: 'assignment',
                      label: 'Count it',
                      config: { assignments: { checked_out_count: v('checked_out_count + 1') } },
                    },
                  ],
                  edges: [{ id: 'c1', source: 'create_checkout', target: 'count_one' }],
                },
                catch: {
                  nodes: [
                    {
                      id: 'count_failed',
                      type: 'assignment',
                      label: 'Count the failure',
                      config: { assignments: { failed_count: v('failed_count + 1') } },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
    { id: 'any_failed', type: 'decision', label: 'Any checkout refused?' },
    refuse(
      'some_failed',
      'Some checkouts were refused',
      '{{ checked_out_count }} checked out, {{ failed_count }} refused. Check the due date and that you may check assets out.',
    ),
    { id: 'end', type: 'end', label: 'Checked out' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'has_input' },
    { id: 'e2', source: 'has_input', target: 'get_in_stock', label: 'yes', condition: HAS_CHECKOUT_INPUT },
    { id: 'e3', source: 'has_input', target: 'no_input', label: 'no', condition: `!(${HAS_CHECKOUT_INPUT})` },
    { id: 'e4', source: 'get_in_stock', target: 'count_in_stock' },
    { id: 'e4a', source: 'count_in_stock', target: 'all_in_stock' },
    { id: 'e5', source: 'all_in_stock', target: 'each_asset', label: 'yes', condition: ALL_IN_STOCK },
    { id: 'e6', source: 'all_in_stock', target: 'not_in_stock', label: 'no', condition: `!(${ALL_IN_STOCK})` },
    { id: 'e7', source: 'each_asset', target: 'any_failed' },
    { id: 'e8', source: 'any_failed', target: 'some_failed', label: 'yes', condition: 'failed_count > 0' },
    { id: 'e9', source: 'any_failed', target: 'end', label: 'no', condition: 'failed_count == 0' },
  ],
});

// ───────────────────────────── Check in ─────────────────────────────

const CHECKOUT_IS_OPEN = "checkout_row != null && checkout_row.status == 'open'";

export const CheckInAssetFlow = defineFlow({
  name: 'check_in_asset',
  label: 'Check in an asset',
  description: 'Returns an asset: closes its open checkout and records the condition on return.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  requiredPermissions: ['demoasset.manage_assets'],
  variables: [
    { name: 'recordId', type: 'text', isInput: true, defaultValue: null },
    { name: 'asset', type: 'text', isInput: true, defaultValue: null },
    { name: 'returned_on', type: 'text', isInput: true, defaultValue: null },
    { name: 'return_condition', type: 'text', isInput: true, defaultValue: 'good' },
    { name: 'checkout_row', type: 'object', defaultValue: null },
    { name: 'checkout_id', type: 'text', isOutput: true, defaultValue: null },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'which', type: 'decision', label: 'A checkout, or an asset?' },
    {
      id: 'get_by_id',
      type: 'get_record',
      label: 'Read the checkout',
      config: { objectName: 'demoasset_checkout', filter: { id: v('recordId') }, outputVariable: 'checkout_row' },
    },
    {
      id: 'get_by_asset',
      type: 'get_record',
      label: "Find the asset's open checkout",
      config: {
        objectName: 'demoasset_checkout',
        filter: { asset: v('asset'), status: 'open' },
        outputVariable: 'checkout_row',
      },
    },
    refuse('no_target', 'Nothing to check in', 'Say which checkout to close, or which asset is being returned.'),
    { id: 'is_open', type: 'decision', label: 'Is there an open checkout?' },
    refuse('not_open', 'No open checkout', 'This asset has no open checkout to close: it is not checked out.'),
    {
      id: 'close_checkout',
      type: 'update_record',
      label: 'Close the checkout',
      config: {
        objectName: 'demoasset_checkout',
        filter: { id: v('checkout_row.id') },
        fields: {
          status: 'returned',
          returned_on: v(`returned_on != null ? returned_on : ${TODAY}`),
          return_condition: v("return_condition != null ? return_condition : 'good'"),
        },
      },
    },
    {
      id: 'set_output',
      type: 'assignment',
      label: 'Report the checkout',
      config: { assignments: { checkout_id: v('checkout_row.id') } },
    },
    { id: 'end', type: 'end', label: 'Returned' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'which' },
    { id: 'e2', source: 'which', target: 'get_by_id', label: 'checkout', condition: 'recordId != null' },
    { id: 'e3', source: 'which', target: 'get_by_asset', label: 'asset', condition: 'recordId == null && asset != null' },
    { id: 'e4', source: 'which', target: 'no_target', label: 'neither', condition: 'recordId == null && asset == null' },
    { id: 'e5', source: 'get_by_id', target: 'is_open' },
    { id: 'e6', source: 'get_by_asset', target: 'is_open' },
    { id: 'e7', source: 'is_open', target: 'close_checkout', label: 'yes', condition: CHECKOUT_IS_OPEN },
    { id: 'e8', source: 'is_open', target: 'not_open', label: 'no', condition: `!(${CHECKOUT_IS_OPEN})` },
    { id: 'e9', source: 'close_checkout', target: 'set_output' },
    { id: 'e10', source: 'set_output', target: 'end' },
  ],
});

// ───────────────────────────── Repair ─────────────────────────────

// The reporter named, else the caller's own employee record, else nobody (the record owner still says who filed it).
const REPORTER = '(reported_by != null ? reported_by : (me != null ? me.id : null))';

export const OpenRepairOrderFlow = defineFlow({
  name: 'open_repair_order',
  label: 'Open a repair order',
  description: 'Reports a fault on an asset: opens a repair order, which sends the asset to repair.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  variables: [
    { name: 'asset', type: 'text', isInput: true, defaultValue: null },
    { name: 'issue', type: 'text', isInput: true, defaultValue: null },
    { name: 'reported_on', type: 'text', isInput: true, defaultValue: null },
    { name: 'reported_by', type: 'text', isInput: true, defaultValue: null },
    { name: 'me', type: 'object', defaultValue: null },
    { name: 'asset_row', type: 'object', defaultValue: null },
    { name: 'repair_order_id', type: 'text', isOutput: true, defaultValue: null },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'has_input', type: 'decision', label: 'Asset and fault given?' },
    refuse('no_input', 'Nothing to report', 'Say which asset is faulty and what the fault is.'),
    {
      id: 'get_asset',
      type: 'get_record',
      label: 'Read the asset',
      config: { objectName: 'demoasset_asset', filter: { id: v('asset') }, outputVariable: 'asset_row' },
    },
    getMeNode,
    { id: 'can_report', type: 'decision', label: 'Asset visible?' },
    refuse('no_asset', 'Asset not found', 'That asset does not exist, or you do not hold it.'),
    {
      id: 'create_order',
      type: 'create_record',
      label: 'Open the repair order',
      config: {
        objectName: 'demoasset_repair_order',
        fields: {
          name: v(`'RO-' + ${TODAY} + '-' + asset_row.name`),
          asset: v('asset'),
          reported_by: v(REPORTER),
          reported_on: v(`reported_on != null ? reported_on : ${TODAY}`),
          issue: v('issue'),
          status: 'open',
        },
        outputVariable: 'repair_order',
      },
    },
    {
      id: 'set_output',
      type: 'assignment',
      label: 'Report the repair order',
      config: { assignments: { repair_order_id: v('repair_order.id') } },
    },
    { id: 'end', type: 'end', label: 'Sent to repair' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'has_input' },
    { id: 'e2', source: 'has_input', target: 'get_asset', label: 'yes', condition: 'asset != null && !isBlank(issue)' },
    { id: 'e3', source: 'has_input', target: 'no_input', label: 'no', condition: '!(asset != null && !isBlank(issue))' },
    { id: 'e4', source: 'get_asset', target: 'get_me' },
    { id: 'e5', source: 'get_me', target: 'can_report' },
    { id: 'e6', source: 'can_report', target: 'no_asset', label: 'no asset', condition: 'asset_row == null' },
    { id: 'e8', source: 'can_report', target: 'create_order', label: 'ok', condition: 'asset_row != null' },
    { id: 'e9', source: 'create_order', target: 'set_output' },
    { id: 'e10', source: 'set_output', target: 'end' },
  ],
});

// ───────────────────────────── Scrap: request ─────────────────────────────

const REQUESTER = '(requested_by != null ? requested_by : (me != null ? me.id : null))';

export const RequestScrapFlow = defineFlow({
  name: 'request_scrap',
  label: 'Request to scrap an asset',
  description: "Files a scrap request for an asset. The manager of the asset's department decides it.",
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  variables: [
    { name: 'asset', type: 'text', isInput: true, defaultValue: null },
    { name: 'reason', type: 'text', isInput: true, defaultValue: null },
    { name: 'requested_by', type: 'text', isInput: true, defaultValue: null },
    { name: 'me', type: 'object', defaultValue: null },
    { name: 'asset_row', type: 'object', defaultValue: null },
    { name: 'disposal_request_id', type: 'text', isOutput: true, defaultValue: null },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'has_input', type: 'decision', label: 'Asset and reason given?' },
    refuse('no_input', 'Nothing to request', 'Say which asset should be scrapped and why.'),
    {
      id: 'get_asset',
      type: 'get_record',
      label: 'Read the asset',
      config: { objectName: 'demoasset_asset', filter: { id: v('asset') }, outputVariable: 'asset_row' },
    },
    getMeNode,
    { id: 'can_request', type: 'decision', label: 'Asset visible and not disposed?' },
    refuse('no_asset', 'Asset not found', 'That asset does not exist, or you do not hold it.'),
    refuse('disposed', 'Already disposed', '{{ asset_row.name }} is already disposed of.'),
    {
      id: 'create_request',
      type: 'create_record',
      label: 'File the scrap request',
      config: {
        objectName: 'demoasset_disposal_request',
        fields: {
          name: v(`'DR-' + ${TODAY} + '-' + asset_row.name`),
          asset: v('asset'),
          requested_by: v(REQUESTER),
          requested_on: v(TODAY),
          reason: v('reason'),
          status: 'submitted',
        },
        outputVariable: 'disposal_request',
      },
    },
    {
      id: 'set_output',
      type: 'assignment',
      label: 'Report the request',
      config: { assignments: { disposal_request_id: v('disposal_request.id') } },
    },
    { id: 'end', type: 'end', label: 'Sent to the department manager' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'has_input' },
    { id: 'e2', source: 'has_input', target: 'get_asset', label: 'yes', condition: 'asset != null && !isBlank(reason)' },
    { id: 'e3', source: 'has_input', target: 'no_input', label: 'no', condition: '!(asset != null && !isBlank(reason))' },
    { id: 'e4', source: 'get_asset', target: 'get_me' },
    { id: 'e5', source: 'get_me', target: 'can_request' },
    { id: 'e6', source: 'can_request', target: 'no_asset', label: 'no asset', condition: 'asset_row == null' },
    { id: 'e7', source: 'can_request', target: 'disposed', label: 'disposed', condition: "asset_row != null && asset_row.status == 'disposed'" },
    { id: 'e9', source: 'can_request', target: 'create_request', label: 'ok', condition: "asset_row != null && asset_row.status != 'disposed'" },
    { id: 'e10', source: 'create_request', target: 'set_output' },
    { id: 'e11', source: 'set_output', target: 'end' },
  ],
});

// ───────────────────────────── Scrap: decide ─────────────────────────────

const VALID_DECISION = "decision in ['approved', 'rejected']";
const REQUEST_SUBMITTED = "request_row != null && request_row.status == 'submitted'";
const I_AM_APPROVER = 'me != null && request_row.approver == me.id';

export const DecideScrapRequestFlow = defineFlow({
  name: 'decide_scrap_request',
  label: 'Decide a scrap request',
  description: 'Approves or rejects a submitted scrap request. Only its approver (the manager of the asset\'s department) may decide it.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  requiredPermissions: ['demoasset.decide_scrap'],
  variables: [
    { name: 'recordId', type: 'text', isInput: true, defaultValue: null },
    { name: 'decision', type: 'text', isInput: true, defaultValue: null },
    { name: 'me', type: 'object', defaultValue: null },
    { name: 'request_row', type: 'object', defaultValue: null },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'has_input', type: 'decision', label: 'Request and decision given?' },
    refuse('no_input', 'Nothing to decide', 'Say which scrap request to decide, and whether it is approved or rejected.'),
    {
      id: 'get_request',
      type: 'get_record',
      label: 'Read the scrap request',
      config: {
        objectName: 'demoasset_disposal_request',
        filter: { id: v('recordId') },
        outputVariable: 'request_row',
      },
    },
    getMeNode,
    { id: 'can_decide', type: 'decision', label: 'Submitted, and mine to decide?' },
    refuse('not_found', 'Request not found', 'That scrap request does not exist, or it is not for an asset of your department.'),
    refuse('already_decided', 'Already decided', '{{ request_row.name }} is already {{ request_row.status }}: a decision cannot be changed.'),
    refuse(
      'not_approver',
      'Not the approver',
      "Only the manager of the asset's department, named as the approver of {{ request_row.name }}, may decide it.",
    ),
    {
      id: 'decide',
      type: 'update_record',
      label: 'Record the decision',
      config: {
        objectName: 'demoasset_disposal_request',
        filter: { id: v('recordId') },
        fields: { status: v('decision'), decided_on: v(TODAY) },
      },
    },
    { id: 'end', type: 'end', label: 'Decided' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'has_input' },
    { id: 'e2', source: 'has_input', target: 'get_request', label: 'yes', condition: `recordId != null && ${VALID_DECISION}` },
    { id: 'e3', source: 'has_input', target: 'no_input', label: 'no', condition: `!(recordId != null && ${VALID_DECISION})` },
    { id: 'e4', source: 'get_request', target: 'get_me' },
    { id: 'e5', source: 'get_me', target: 'can_decide' },
    { id: 'e6', source: 'can_decide', target: 'not_found', label: 'not found', condition: 'request_row == null' },
    {
      id: 'e7',
      source: 'can_decide',
      target: 'already_decided',
      label: 'decided',
      condition: "request_row != null && request_row.status != 'submitted'",
    },
    { id: 'e8', source: 'can_decide', target: 'not_approver', label: 'not mine', condition: `${REQUEST_SUBMITTED} && !(${I_AM_APPROVER})` },
    { id: 'e9', source: 'can_decide', target: 'decide', label: 'ok', condition: `${REQUEST_SUBMITTED} && ${I_AM_APPROVER}` },
    { id: 'e10', source: 'decide', target: 'end' },
  ],
});

// ───────────────────────────── Scrap: dispose ─────────────────────────────

export const DisposeAssetFlow = defineFlow({
  name: 'dispose_asset',
  label: 'Dispose of an asset',
  description: 'Completes an approved scrap request: the asset is disposed of and its remaining book value written off. Irreversible.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  requiredPermissions: ['demoasset.manage_assets'],
  variables: [
    { name: 'recordId', type: 'text', isInput: true, defaultValue: null },
    { name: 'request_row', type: 'object', defaultValue: null },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'has_input', type: 'decision', label: 'Request given?' },
    refuse('no_input', 'Nothing to dispose of', 'Say which approved scrap request to complete.'),
    {
      id: 'get_request',
      type: 'get_record',
      label: 'Read the scrap request',
      config: {
        objectName: 'demoasset_disposal_request',
        filter: { id: v('recordId') },
        outputVariable: 'request_row',
      },
    },
    { id: 'is_approved', type: 'decision', label: 'Approved?' },
    refuse('not_found', 'Request not found', 'That scrap request does not exist.'),
    refuse(
      'not_approved',
      'Not approved',
      "{{ request_row.name }} is {{ request_row.status }}. An asset is disposed of only once the manager of its department has approved the scrap request.",
    ),
    {
      id: 'complete',
      type: 'update_record',
      label: 'Complete the request (disposes of the asset)',
      config: {
        objectName: 'demoasset_disposal_request',
        filter: { id: v('recordId') },
        fields: { status: 'completed', disposed_on: v(TODAY) },
      },
    },
    { id: 'end', type: 'end', label: 'Disposed' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'has_input' },
    { id: 'e2', source: 'has_input', target: 'get_request', label: 'yes', condition: 'recordId != null' },
    { id: 'e3', source: 'has_input', target: 'no_input', label: 'no', condition: 'recordId == null' },
    { id: 'e4', source: 'get_request', target: 'is_approved' },
    { id: 'e5', source: 'is_approved', target: 'not_found', label: 'not found', condition: 'request_row == null' },
    { id: 'e6', source: 'is_approved', target: 'not_approved', label: 'no', condition: "request_row != null && request_row.status != 'approved'" },
    { id: 'e7', source: 'is_approved', target: 'complete', label: 'yes', condition: "request_row != null && request_row.status == 'approved'" },
    { id: 'e8', source: 'complete', target: 'end' },
  ],
});

// ───────────────────────────── Transfer: request ─────────────────────────────

const TRANSFER_INPUT = 'asset != null && to_department != null && !isBlank(reason)';
const TRANSFER_REQUESTER = '(requested_by != null ? requested_by : (me != null ? me.id : null))';
const ASSET_LIVE = "asset_row != null && asset_row.status != 'disposed'";

export const RequestTransferFlow = defineFlow({
  name: 'request_transfer',
  label: 'Request to transfer an asset',
  description: 'Files a transfer of an asset to another department. The manager of the receiving department decides it.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  requiredPermissions: ['demoasset.manage_assets'],
  variables: [
    { name: 'asset', type: 'text', isInput: true, defaultValue: null },
    { name: 'to_department', type: 'text', isInput: true, defaultValue: null },
    { name: 'reason', type: 'text', isInput: true, defaultValue: null },
    { name: 'requested_by', type: 'text', isInput: true, defaultValue: null },
    { name: 'me', type: 'object', defaultValue: null },
    { name: 'asset_row', type: 'object', defaultValue: null },
    { name: 'pending_transfer', type: 'object', defaultValue: null },
    { name: 'asset_transfer_id', type: 'text', isOutput: true, defaultValue: null },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'has_input', type: 'decision', label: 'Asset, department and reason given?' },
    refuse('no_input', 'Nothing to request', 'Say which asset should move, to which department, and why.'),
    {
      id: 'get_asset',
      type: 'get_record',
      label: 'Read the asset',
      config: { objectName: 'demoasset_asset', filter: { id: v('asset') }, outputVariable: 'asset_row' },
    },
    getMeNode,
    {
      id: 'get_pending',
      type: 'get_record',
      label: "Find the asset's pending transfer",
      config: {
        objectName: 'demoasset_asset_transfer',
        filter: { asset: v('asset'), status: 'submitted' },
        outputVariable: 'pending_transfer',
      },
    },
    { id: 'can_request', type: 'decision', label: 'Asset live, free to move, and to another department?' },
    refuse('no_asset', 'Asset not found', 'That asset does not exist, or you cannot see it.'),
    refuse('disposed', 'Already disposed', '{{ asset_row.name }} is disposed of and cannot be transferred.'),
    refuse('same_department', 'Already there', '{{ asset_row.name }} already belongs to that department.'),
    refuse(
      'already_pending',
      'Transfer pending',
      '{{ asset_row.name }} already has a pending transfer ({{ pending_transfer.name }}). It must be decided or cancelled first.',
    ),
    {
      id: 'create_transfer',
      type: 'create_record',
      label: 'File the transfer',
      config: {
        objectName: 'demoasset_asset_transfer',
        fields: {
          name: v(`'TR-' + ${TODAY} + '-' + asset_row.name`),
          asset: v('asset'),
          to_department: v('to_department'),
          requested_by: v(TRANSFER_REQUESTER),
          requested_on: v(TODAY),
          reason: v('reason'),
          status: 'submitted',
        },
        outputVariable: 'asset_transfer',
      },
    },
    {
      id: 'set_output',
      type: 'assignment',
      label: 'Report the transfer',
      config: { assignments: { asset_transfer_id: v('asset_transfer.id') } },
    },
    { id: 'end', type: 'end', label: 'Sent to the receiving manager' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'has_input' },
    { id: 'e2', source: 'has_input', target: 'get_asset', label: 'yes', condition: TRANSFER_INPUT },
    { id: 'e3', source: 'has_input', target: 'no_input', label: 'no', condition: `!(${TRANSFER_INPUT})` },
    { id: 'e4', source: 'get_asset', target: 'get_me' },
    { id: 'e5', source: 'get_me', target: 'get_pending' },
    { id: 'e6', source: 'get_pending', target: 'can_request' },
    { id: 'e7', source: 'can_request', target: 'no_asset', label: 'no asset', condition: 'asset_row == null' },
    { id: 'e8', source: 'can_request', target: 'disposed', label: 'disposed', condition: "asset_row != null && asset_row.status == 'disposed'" },
    {
      id: 'e9',
      source: 'can_request',
      target: 'same_department',
      label: 'same department',
      condition: `${ASSET_LIVE} && asset_row.department == to_department`,
    },
    {
      id: 'e10',
      source: 'can_request',
      target: 'already_pending',
      label: 'pending',
      condition: `${ASSET_LIVE} && asset_row.department != to_department && pending_transfer != null`,
    },
    {
      id: 'e11',
      source: 'can_request',
      target: 'create_transfer',
      label: 'ok',
      condition: `${ASSET_LIVE} && asset_row.department != to_department && pending_transfer == null`,
    },
    { id: 'e12', source: 'create_transfer', target: 'set_output' },
    { id: 'e13', source: 'set_output', target: 'end' },
  ],
});

// ───────────────────────────── Transfer: decide ─────────────────────────────

const TRANSFER_SUBMITTED = "transfer_row != null && transfer_row.status == 'submitted'";
const I_APPROVE_TRANSFER = 'me != null && transfer_row.approver == me.id';

const getTransferNode = {
  id: 'get_transfer',
  type: 'get_record' as const,
  label: 'Read the transfer',
  config: {
    objectName: 'demoasset_asset_transfer',
    filter: { id: v('recordId') },
    outputVariable: 'transfer_row',
  },
};

export const DecideTransferFlow = defineFlow({
  name: 'decide_asset_transfer',
  label: 'Decide an asset transfer',
  description: 'Approves or rejects a submitted transfer. Only its approver (the manager of the receiving department) may decide it.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  requiredPermissions: ['demoasset.decide_transfer'],
  variables: [
    { name: 'recordId', type: 'text', isInput: true, defaultValue: null },
    { name: 'decision', type: 'text', isInput: true, defaultValue: null },
    { name: 'me', type: 'object', defaultValue: null },
    { name: 'transfer_row', type: 'object', defaultValue: null },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'has_input', type: 'decision', label: 'Transfer and decision given?' },
    refuse('no_input', 'Nothing to decide', 'Say which transfer to decide, and whether it is approved or rejected.'),
    getTransferNode,
    getMeNode,
    { id: 'can_decide', type: 'decision', label: 'Submitted, and mine to decide?' },
    refuse('not_found', 'Transfer not found', 'That transfer does not exist, or it does not concern your department.'),
    refuse('already_decided', 'Already decided', '{{ transfer_row.name }} is already {{ transfer_row.status }}: a decision cannot be changed.'),
    refuse(
      'not_approver',
      'Not the approver',
      'Only the manager of the receiving department, named as the approver of {{ transfer_row.name }}, may decide it.',
    ),
    {
      id: 'decide',
      type: 'update_record',
      label: 'Record the decision',
      config: {
        objectName: 'demoasset_asset_transfer',
        filter: { id: v('recordId') },
        fields: { status: v('decision'), decided_on: v(TODAY) },
      },
    },
    { id: 'end', type: 'end', label: 'Decided' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'has_input' },
    { id: 'e2', source: 'has_input', target: 'get_transfer', label: 'yes', condition: `recordId != null && ${VALID_DECISION}` },
    { id: 'e3', source: 'has_input', target: 'no_input', label: 'no', condition: `!(recordId != null && ${VALID_DECISION})` },
    { id: 'e4', source: 'get_transfer', target: 'get_me' },
    { id: 'e5', source: 'get_me', target: 'can_decide' },
    { id: 'e6', source: 'can_decide', target: 'not_found', label: 'not found', condition: 'transfer_row == null' },
    {
      id: 'e7',
      source: 'can_decide',
      target: 'already_decided',
      label: 'decided',
      condition: "transfer_row != null && transfer_row.status != 'submitted'",
    },
    { id: 'e8', source: 'can_decide', target: 'not_approver', label: 'not mine', condition: `${TRANSFER_SUBMITTED} && !(${I_APPROVE_TRANSFER})` },
    { id: 'e9', source: 'can_decide', target: 'decide', label: 'ok', condition: `${TRANSFER_SUBMITTED} && ${I_APPROVE_TRANSFER}` },
    { id: 'e10', source: 'decide', target: 'end' },
  ],
});

// ───────────────────────────── Transfer: cancel ─────────────────────────────

export const CancelTransferFlow = defineFlow({
  name: 'cancel_asset_transfer',
  label: 'Cancel an asset transfer',
  description: 'Withdraws a transfer that is still awaiting its decision. The asset stays where it is.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  requiredPermissions: ['demoasset.manage_assets'],
  variables: [
    { name: 'recordId', type: 'text', isInput: true, defaultValue: null },
    { name: 'transfer_row', type: 'object', defaultValue: null },
  ],
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'has_input', type: 'decision', label: 'Transfer given?' },
    refuse('no_input', 'Nothing to cancel', 'Say which transfer to cancel.'),
    getTransferNode,
    { id: 'is_submitted', type: 'decision', label: 'Still awaiting a decision?' },
    refuse('not_found', 'Transfer not found', 'That transfer does not exist.'),
    refuse('already_decided', 'Already decided', '{{ transfer_row.name }} is already {{ transfer_row.status }} and cannot be cancelled.'),
    {
      id: 'cancel',
      type: 'update_record',
      label: 'Cancel the transfer',
      config: {
        objectName: 'demoasset_asset_transfer',
        filter: { id: v('recordId') },
        fields: { status: 'cancelled' },
      },
    },
    { id: 'end', type: 'end', label: 'Cancelled' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'has_input' },
    { id: 'e2', source: 'has_input', target: 'get_transfer', label: 'yes', condition: 'recordId != null' },
    { id: 'e3', source: 'has_input', target: 'no_input', label: 'no', condition: 'recordId == null' },
    { id: 'e4', source: 'get_transfer', target: 'is_submitted' },
    { id: 'e5', source: 'is_submitted', target: 'not_found', label: 'not found', condition: 'transfer_row == null' },
    { id: 'e6', source: 'is_submitted', target: 'already_decided', label: 'no', condition: "transfer_row != null && transfer_row.status != 'submitted'" },
    { id: 'e7', source: 'is_submitted', target: 'cancel', label: 'yes', condition: TRANSFER_SUBMITTED },
    { id: 'e8', source: 'cancel', target: 'end' },
  ],
});
