import { defineFlow } from '@objectstack/spec';
import { v, getAssetNode } from './_cel.js';

/**
 * A new open checkout puts the asset in use with the employee as its custodian.
 * (That only an asset in stock can be checked out is a validation rule on the
 * checkout, so by the time this runs the asset is in stock.)
 */
export const CheckoutOpenedFlow = defineFlow({
  name: 'checkout_opened',
  label: 'Checkout: put the asset in use',
  description: 'When an open checkout is saved, the asset becomes In use and the employee its custodian.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On checkout created',
      config: {
        objectName: 'demoasset_checkout',
        triggerType: 'record-after-create',
        condition: "record.status == 'open'",
      },
    },
    getAssetNode,
    { id: 'in_stock', type: 'decision', label: 'Asset in stock?' },
    {
      id: 'set_in_use',
      type: 'update_record',
      label: 'Asset in use, employee is custodian',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: v('record.asset') },
        fields: { status: 'in_use', custodian: v('record.employee') },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_asset' },
    { id: 'e2', source: 'get_asset', target: 'in_stock' },
    { id: 'e3', source: 'in_stock', target: 'set_in_use', label: 'yes', condition: "asset_row != null && asset_row.status == 'in_stock'" },
    { id: 'e4', source: 'in_stock', target: 'end', label: 'no', condition: "!(asset_row != null && asset_row.status == 'in_stock')" },
    { id: 'e5', source: 'set_in_use', target: 'end' },
  ],
});

/** A return clears the custodian and puts the asset back in stock. */
export const CheckoutReturnedFlow = defineFlow({
  name: 'checkout_returned',
  label: 'Checkout: return the asset to stock',
  description: 'When a checkout is returned, the asset loses its custodian and is In stock again.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On checkout returned',
      config: {
        objectName: 'demoasset_checkout',
        triggerType: 'record-after-update',
        condition: "previous.status == 'open' && record.status == 'returned'",
      },
    },
    getAssetNode,
    { id: 'in_use', type: 'decision', label: 'Asset in use?' },
    {
      id: 'clear_custodian',
      type: 'update_record',
      label: 'Asset back in stock, no custodian',
      config: {
        objectName: 'demoasset_asset',
        filter: { id: v('record.asset') },
        fields: { status: 'in_stock', custodian: null },
      },
    },
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_asset' },
    { id: 'e2', source: 'get_asset', target: 'in_use' },
    { id: 'e3', source: 'in_use', target: 'clear_custodian', label: 'yes', condition: "asset_row != null && asset_row.status == 'in_use'" },
    { id: 'e4', source: 'in_use', target: 'end', label: 'no', condition: "!(asset_row != null && asset_row.status == 'in_use')" },
    { id: 'e5', source: 'clear_custodian', target: 'end' },
  ],
});
