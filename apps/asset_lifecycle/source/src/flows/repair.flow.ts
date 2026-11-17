import { defineFlow } from '@objectstack/spec';
import { v, getAssetNode, getOpenCheckoutNode } from './_cel.js';

/**
 * A repair order that is not yet completed sends the asset to repair: an open
 * checkout is closed as returned damaged (which clears the custodian), and the
 * asset is In repair.
 */
export const RepairOpenedFlow = defineFlow({
  name: 'repair_opened',
  label: 'Repair: send the asset to repair',
  description: 'When a repair order is opened, the asset is returned (if checked out) and becomes In repair.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On repair order created',
      config: {
        objectName: 'demoasset_repair_order',
        triggerType: 'record-after-create',
        condition: "record.status != 'completed'",
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
        fields: { status: 'returned', returned_on: v('record.reported_on'), return_condition: 'damaged' },
      },
    },
    getAssetNode,
    { id: 'can_repair', type: 'decision', label: 'Asset in stock or in use?' },
    {
      id: 'set_in_repair',
      type: 'update_record',
      label: 'Asset in repair, no custodian',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: v('record.asset') },
        fields: { status: 'in_repair', custodian: null },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_open_checkout' },
    { id: 'e2', source: 'get_open_checkout', target: 'is_checked_out' },
    { id: 'e3', source: 'is_checked_out', target: 'close_checkout', label: 'yes', condition: 'open_checkout != null' },
    { id: 'e4', source: 'is_checked_out', target: 'get_asset', label: 'no', condition: 'open_checkout == null' },
    { id: 'e5', source: 'close_checkout', target: 'get_asset' },
    // A checkout that cannot be closed must not keep the asset out of repair.
    { id: 'e5f', source: 'close_checkout', target: 'get_asset', type: 'fault' },
    { id: 'e6', source: 'get_asset', target: 'can_repair' },
    { id: 'e7', source: 'can_repair', target: 'set_in_repair', label: 'yes', condition: "asset_row != null && asset_row.status in ['in_stock', 'in_use']" },
    { id: 'e8', source: 'can_repair', target: 'end', label: 'no', condition: "!(asset_row != null && asset_row.status in ['in_stock', 'in_use'])" },
    { id: 'e9', source: 'set_in_repair', target: 'end' },
  ],
});

/** A completed repair puts the asset back in stock. */
export const RepairCompletedFlow = defineFlow({
  name: 'repair_completed',
  label: 'Repair: return the fixed asset to stock',
  description: 'When a repair order is completed, the asset is In stock again.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On repair order completed',
      config: {
        objectName: 'demoasset_repair_order',
        triggerType: 'record-after-update',
        condition: "previous.status != 'completed' && record.status == 'completed'",
      },
    },
    getAssetNode,
    { id: 'in_repair', type: 'decision', label: 'Asset in repair?' },
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
    { id: 'e2', source: 'get_asset', target: 'in_repair' },
    { id: 'e3', source: 'in_repair', target: 'set_in_stock', label: 'yes', condition: "asset_row != null && asset_row.status == 'in_repair'" },
    { id: 'e4', source: 'in_repair', target: 'end', label: 'no', condition: "!(asset_row != null && asset_row.status == 'in_repair')" },
    { id: 'e5', source: 'set_in_stock', target: 'end' },
  ],
});
