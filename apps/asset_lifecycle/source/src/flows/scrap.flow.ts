import { defineFlow } from '@objectstack/spec';
import { v, getAssetNode, getOpenCheckoutNode } from './_cel.js';

const HAS_NEW_APPROVER = 'department != null && department.manager != null && department.manager != record.approver';
const IN_CIRCULATION = "asset_row != null && asset_row.status in ['in_stock', 'in_use', 'in_repair']";

/**
 * A submitted scrap request is routed to the manager of the asset's department
 * (the request records them as its approver) and takes the asset out of
 * circulation: an open checkout is closed and the asset is Pending disposal.
 */
export const ScrapRequestedFlow = defineFlow({
  name: 'scrap_requested',
  label: 'Scrap request: route to the department manager',
  description: "When a scrap request is filed, its approver becomes the manager of the asset's department and the asset is Pending disposal.",
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On scrap request filed',
      config: {
        objectName: 'demoasset_disposal_request',
        triggerType: 'record-after-create',
        condition: "record.status == 'submitted'",
      },
    },
    {
      id: 'get_department',
      type: 'get_record',
      label: "Read the asset's department",
      config: {
        objectName: 'demoasset_department',
        filter: { id: v('record.asset_department') },
        outputVariable: 'department',
      },
    },
    { id: 'has_manager', type: 'decision', label: 'Department has a manager?' },
    {
      id: 'set_approver',
      type: 'update_record',
      label: 'The department manager is the approver',
      config: {
        objectName: 'demoasset_disposal_request',
        filter: { id: v('record.id') },
        fields: { approver: v('department.manager') },
      },
    },
    getOpenCheckoutNode,
    { id: 'is_checked_out', type: 'decision', label: 'Asset checked out?' },
    {
      id: 'close_checkout',
      type: 'update_record',
      label: 'Close the open checkout as returned damaged',
      config: {
        objectName: 'demoasset_checkout',
        filter: { id: v('open_checkout.id') },
        fields: { status: 'returned', returned_on: v('record.requested_on'), return_condition: 'damaged' },
      },
    },
    getAssetNode,
    { id: 'in_circulation', type: 'decision', label: 'Asset still in circulation?' },
    {
      id: 'set_pending',
      type: 'update_record',
      label: 'Asset pending disposal, no custodian',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: v('record.asset') },
        fields: { status: 'pending_disposal', custodian: null },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_department' },
    { id: 'e2', source: 'get_department', target: 'has_manager' },
    { id: 'e3', source: 'has_manager', target: 'set_approver', label: 'yes', condition: HAS_NEW_APPROVER },
    { id: 'e4', source: 'has_manager', target: 'get_open_checkout', label: 'no', condition: `!(${HAS_NEW_APPROVER})` },
    { id: 'e5', source: 'set_approver', target: 'get_open_checkout' },
    { id: 'e6', source: 'get_open_checkout', target: 'is_checked_out' },
    { id: 'e7', source: 'is_checked_out', target: 'close_checkout', label: 'yes', condition: 'open_checkout != null' },
    { id: 'e8', source: 'is_checked_out', target: 'get_asset', label: 'no', condition: 'open_checkout == null' },
    { id: 'e9', source: 'close_checkout', target: 'get_asset' },
    { id: 'e9f', source: 'close_checkout', target: 'get_asset', type: 'fault' },
    { id: 'e10', source: 'get_asset', target: 'in_circulation' },
    { id: 'e11', source: 'in_circulation', target: 'set_pending', label: 'yes', condition: IN_CIRCULATION },
    { id: 'e12', source: 'in_circulation', target: 'end', label: 'no', condition: `!(${IN_CIRCULATION})` },
    { id: 'e13', source: 'set_pending', target: 'end' },
  ],
});

/** A rejected scrap request releases the asset back to stock. */
export const ScrapRejectedFlow = defineFlow({
  name: 'scrap_rejected',
  label: 'Scrap request: release a rejected asset',
  description: 'When a scrap request is rejected, the asset is In stock again.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On scrap request rejected',
      config: {
        objectName: 'demoasset_disposal_request',
        triggerType: 'record-after-update',
        condition: "previous.status == 'submitted' && record.status == 'rejected'",
      },
    },
    getAssetNode,
    { id: 'is_pending', type: 'decision', label: 'Asset pending disposal?' },
    {
      id: 'set_in_stock',
      type: 'update_record',
      label: 'Asset back in stock',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: v('record.asset') },
        fields: { status: 'in_stock' },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_asset' },
    { id: 'e2', source: 'get_asset', target: 'is_pending' },
    { id: 'e3', source: 'is_pending', target: 'set_in_stock', label: 'yes', condition: "asset_row != null && asset_row.status == 'pending_disposal'" },
    { id: 'e4', source: 'is_pending', target: 'end', label: 'no', condition: "!(asset_row != null && asset_row.status == 'pending_disposal')" },
    { id: 'e5', source: 'set_in_stock', target: 'end' },
  ],
});

const HAS_BOOK_VALUE = 'asset_row.book_value != null && asset_row.book_value > 0';
const DISPOSED_ON = '(record.disposed_on != null ? record.disposed_on : isoDate(today()))';

/**
 * Disposal: completing an approved scrap request disposes of the asset.
 *
 *  1. The remaining book value is written off: it is posted as a final
 *     depreciation entry (kind "write-off"), so accumulated depreciation
 *     reaches the purchase cost and the book value is zero.
 *  2. The asset is set Disposed. That status is a dead end of the asset's
 *     lifecycle, so a disposal cannot be undone.
 *  3. The request records the amount written off.
 *
 * A disposed asset is skipped by the monthly depreciation run.
 */
export const ScrapCompletedFlow = defineFlow({
  name: 'scrap_completed',
  label: 'Scrap request: dispose of the asset',
  description: 'When an approved scrap request is completed, the remaining book value is written off and the asset is Disposed.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  variables: [{ name: 'written_off', type: 'number', defaultValue: 0 }],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On scrap request completed',
      config: {
        objectName: 'demoasset_disposal_request',
        triggerType: 'record-after-update',
        condition: "previous.status == 'approved' && record.status == 'completed'",
      },
    },
    getAssetNode,
    { id: 'which_state', type: 'decision', label: 'Where is the asset?' },
    {
      id: 'withdraw',
      type: 'update_record',
      label: 'Take the asset out of circulation first',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: v('record.asset') },
        fields: { status: 'pending_disposal', custodian: null },
      },
    },
    { id: 'has_book_value', type: 'decision', label: 'Any book value left?' },
    {
      id: 'write_off',
      type: 'create_record',
      label: 'Write off the remaining book value',
      config: {
        objectName: 'demoasset_depreciation_entry',
        fields: {
          asset: v('record.asset'),
          period: v(`${DISPOSED_ON}.substring(0, 7)`),
          kind: 'write_off',
          posted_on: v(DISPOSED_ON),
          amount: v('asset_row.book_value'),
        },
      },
    },
    {
      id: 'note_write_off',
      type: 'assignment',
      label: 'Remember the amount',
      config: { assignments: { written_off: v('asset_row.book_value') } },
    },
    {
      id: 'dispose',
      type: 'update_record',
      label: 'Asset disposed',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: v('record.asset') },
        fields: { status: 'disposed', custodian: null, disposed_on: v(DISPOSED_ON) },
      },
    },
    {
      id: 'record_write_off',
      type: 'update_record',
      label: 'Record the write-off on the request',
      config: {
        objectName: 'demoasset_disposal_request',
        filter: { id: v('record.id') },
        fields: { written_off_amount: v('written_off') },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_asset' },
    { id: 'e2', source: 'get_asset', target: 'which_state' },
    { id: 'e3', source: 'which_state', target: 'withdraw', label: 'in circulation', condition: IN_CIRCULATION },
    { id: 'e4', source: 'which_state', target: 'has_book_value', label: 'pending disposal', condition: "asset_row != null && asset_row.status == 'pending_disposal'" },
    { id: 'e5', source: 'which_state', target: 'end', label: 'gone or disposed', condition: "asset_row == null || asset_row.status == 'disposed'" },
    { id: 'e6', source: 'withdraw', target: 'has_book_value' },
    { id: 'e7', source: 'has_book_value', target: 'write_off', label: 'yes', condition: HAS_BOOK_VALUE },
    { id: 'e8', source: 'has_book_value', target: 'dispose', label: 'no', condition: `!(${HAS_BOOK_VALUE})` },
    { id: 'e9', source: 'write_off', target: 'note_write_off' },
    { id: 'e10', source: 'note_write_off', target: 'dispose' },
    { id: 'e11', source: 'dispose', target: 'record_write_off' },
    { id: 'e12', source: 'record_write_off', target: 'end' },
  ],
});
