import { defineView } from '@objectstack/spec';

const data = { provider: 'object' as const, object: 'demoasset_repair_order' };

const columns = [
  { field: 'name', link: true },
  { field: 'asset' },
  { field: 'issue' },
  { field: 'status' },
  { field: 'reported_by' },
  { field: 'reported_on' },
  { field: 'cost', align: 'right' as const },
  { field: 'completed_on' },
];

export const RepairOrderViews = defineView({
  list: {
    label: 'All Repair Orders',
    type: 'grid',
    data,
    columns,
    sort: [{ field: 'reported_on', order: 'desc' }],
    pagination: { pageSize: 50 },
  },
  listViews: {
    in_repair: {
      label: 'In Repair',
      type: 'grid',
      data,
      columns,
      filter: [{ field: 'status', operator: 'not_equals', value: 'completed' }],
      sort: [{ field: 'reported_on', order: 'asc' }],
    },
  },
});
