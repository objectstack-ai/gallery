import { defineView } from '@objectstack/spec';

const data = { provider: 'object' as const, object: 'demoasset_disposal_request' };

const columns = [
  { field: 'name', link: true },
  { field: 'asset' },
  { field: 'reason' },
  { field: 'status' },
  { field: 'requested_by' },
  { field: 'requested_on' },
  { field: 'approver' },
  { field: 'decided_on' },
  { field: 'disposed_on' },
];

export const DisposalRequestViews = defineView({
  list: {
    label: 'All Scrap Requests',
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
    to_dispose: {
      label: 'Approved, To Dispose',
      type: 'grid',
      data,
      columns,
      filter: [{ field: 'status', operator: 'equals', value: 'approved' }],
      sort: [{ field: 'decided_on', order: 'asc' }],
    },
  },
});
