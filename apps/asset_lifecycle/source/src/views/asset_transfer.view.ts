import { defineView } from '@objectstack/spec';

const data = { provider: 'object' as const, object: 'demoasset_asset_transfer' };

const columns = [
  { field: 'name', link: true },
  { field: 'asset_tag' },
  { field: 'from_department' },
  { field: 'to_department' },
  { field: 'reason' },
  { field: 'status' },
  { field: 'requested_by' },
  { field: 'requested_on' },
  { field: 'approver' },
  { field: 'decided_on' },
];

export const AssetTransferViews = defineView({
  list: {
    label: 'All Asset Transfers',
    type: 'grid',
    data,
    columns,
    sort: [{ field: 'requested_on', order: 'desc' }],
    pagination: { pageSize: 50 },
  },
  listViews: {
    to_decide: {
      label: 'Awaiting Decision',
      type: 'grid',
      data,
      columns,
      filter: [{ field: 'status', operator: 'equals', value: 'submitted' }],
      sort: [{ field: 'requested_on', order: 'asc' }],
    },
  },
});
