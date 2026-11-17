import { defineFlow } from '@objectstack/spec';
import { v } from './_cel.js';

/** Reads the transfer's asset into the flow variable `moving`. */
const getMovingAssetNode = {
  id: 'get_asset',
  type: 'get_record' as const,
  label: 'Read the asset',
  config: { objectName: 'demoasset_asset', filter: { id: v('record.asset') }, outputVariable: 'moving' },
};

const HAS_MANAGER = 'receiving != null && receiving.manager != null';

/**
 * A submitted transfer is routed to the manager of the receiving department
 * (the transfer records them as its approver) and keeps a copy of the asset's
 * tag and of the department it is leaving. The asset itself is untouched until
 * the transfer is approved.
 */
export const TransferRequestedFlow = defineFlow({
  name: 'transfer_requested',
  label: 'Asset transfer: route to the receiving manager',
  description:
    'When a transfer is filed, its approver becomes the manager of the receiving department, and it records the department the asset is leaving.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  variables: [
    { name: 'moving', type: 'object', defaultValue: null },
    { name: 'receiving', type: 'object', defaultValue: null },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On transfer filed',
      config: {
        objectName: 'demoasset_asset_transfer',
        triggerType: 'record-after-create',
        condition: "record.status == 'submitted'",
      },
    },
    getMovingAssetNode,
    {
      id: 'get_department',
      type: 'get_record',
      label: 'Read the receiving department',
      config: {
        objectName: 'demoasset_department',
        filter: { id: v('record.to_department') },
        outputVariable: 'receiving',
      },
    },
    { id: 'has_asset', type: 'decision', label: 'Asset found?' },
    {
      id: 'stamp_origin',
      type: 'update_record',
      label: 'Record the asset tag and the department it leaves',
      config: {
        objectName: 'demoasset_asset_transfer',
        filter: { id: v('record.id') },
        fields: { asset_tag: v('moving.name'), from_department: v('moving.department') },
      },
    },
    { id: 'has_manager', type: 'decision', label: 'Receiving department has a manager?' },
    {
      id: 'set_approver',
      type: 'update_record',
      label: 'The receiving manager is the approver',
      config: {
        objectName: 'demoasset_asset_transfer',
        filter: { id: v('record.id') },
        fields: { approver: v('receiving.manager') },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_asset' },
    { id: 'e2', source: 'get_asset', target: 'get_department' },
    { id: 'e3', source: 'get_department', target: 'has_asset' },
    { id: 'e4', source: 'has_asset', target: 'stamp_origin', label: 'yes', condition: 'moving != null' },
    { id: 'e5', source: 'has_asset', target: 'has_manager', label: 'no', condition: 'moving == null' },
    { id: 'e6', source: 'stamp_origin', target: 'has_manager' },
    { id: 'e7', source: 'has_manager', target: 'set_approver', label: 'yes', condition: HAS_MANAGER },
    { id: 'e8', source: 'has_manager', target: 'end', label: 'no', condition: `!(${HAS_MANAGER})` },
    { id: 'e9', source: 'set_approver', target: 'end' },
  ],
});

const CAN_MOVE = "moving != null && moving.status != 'disposed' && moving.department != record.to_department";

/**
 * An approved transfer moves the asset: its owning department becomes the
 * receiving department. The asset's status and custodian are unchanged, and
 * its repair orders, scrap requests and depreciation entries follow it (the
 * `asset_department_changed` flow fires on this write).
 */
export const TransferApprovedFlow = defineFlow({
  name: 'transfer_approved',
  label: 'Asset transfer: move the asset',
  description: 'When a transfer is approved, the asset belongs to the receiving department.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  variables: [{ name: 'moving', type: 'object', defaultValue: null }],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On transfer approved',
      config: {
        objectName: 'demoasset_asset_transfer',
        triggerType: 'record-after-update',
        condition: "previous.status == 'submitted' && record.status == 'approved'",
      },
    },
    getMovingAssetNode,
    { id: 'can_move', type: 'decision', label: 'Asset still to move?' },
    {
      id: 'move',
      type: 'update_record',
      label: 'Asset belongs to the receiving department',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: v('record.asset') },
        fields: { department: v('record.to_department') },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_asset' },
    { id: 'e2', source: 'get_asset', target: 'can_move' },
    { id: 'e3', source: 'can_move', target: 'move', label: 'yes', condition: CAN_MOVE },
    { id: 'e4', source: 'can_move', target: 'end', label: 'no', condition: `!(${CAN_MOVE})` },
    { id: 'e5', source: 'move', target: 'end' },
  ],
});
