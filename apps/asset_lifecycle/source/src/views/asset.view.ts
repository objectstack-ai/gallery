import { defineView } from '@objectstack/spec';

const data = { provider: 'object' as const, object: 'demoasset_asset' };

const columns = [
  { field: 'name', link: true },
  { field: 'serial_no' },
  { field: 'category' },
  { field: 'department' },
  { field: 'status' },
  { field: 'custodian' },
  { field: 'purchase_date' },
  { field: 'purchase_cost', align: 'right' as const },
  { field: 'book_value', align: 'right' as const },
];

export const AssetViews = defineView({
  list: {
    label: 'All Assets',
    type: 'grid',
    data,
    columns,
    sort: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 50 },
  },
  listViews: {
    in_stock: {
      label: 'In Stock',
      type: 'grid',
      data,
      columns,
      filter: [{ field: 'status', operator: 'equals', value: 'in_stock' }],
      sort: [{ field: 'name', order: 'asc' }],
    },
    by_status: {
      label: 'By Status',
      type: 'kanban',
      data,
      columns: ['name', 'category', 'department', 'custodian'],
      kanban: { groupByField: 'status', columns: ['name', 'category', 'custodian'] },
    },
  },
});
