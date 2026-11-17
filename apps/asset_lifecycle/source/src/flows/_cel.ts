// A CEL value envelope: the one spelling a flow value slot or filter operand
// takes for a computed value (a bare string there is literal text).
export const v = (source: string) => ({ dialect: 'cel' as const, source });

/** Reads the trigger record's asset into the flow variable `asset_row`. */
export const getAssetNode = {
  id: 'get_asset',
  type: 'get_record' as const,
  label: 'Read the asset',
  config: { objectName: 'demoasset_asset', filter: { id: v('record.asset') }, outputVariable: 'asset_row' },
};

/** Reads the open checkout of the trigger record's asset (there is at most one) into `open_checkout`. */
export const getOpenCheckoutNode = {
  id: 'get_open_checkout',
  type: 'get_record' as const,
  label: "Find the asset's open checkout",
  config: {
    objectName: 'demoasset_checkout',
    filter: { asset: v('record.asset'), status: 'open' },
    outputVariable: 'open_checkout',
  },
};
