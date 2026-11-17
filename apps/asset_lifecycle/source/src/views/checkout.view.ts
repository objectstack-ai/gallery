import { defineView } from '@objectstack/spec';

const data = { provider: 'object' as const, object: 'demoasset_checkout' };

const columns = [
  { field: 'name', link: true },
  { field: 'asset' },
  { field: 'employee' },
  { field: 'checked_out_on' },
  { field: 'due_on' },
  { field: 'status' },
  { field: 'returned_on' },
  { field: 'return_condition' },
];

export const CheckoutViews = defineView({
  list: {
    label: 'All Checkouts',
    type: 'grid',
    data,
    columns,
    sort: [{ field: 'checked_out_on', order: 'desc' }],
    pagination: { pageSize: 50 },
  },
  listViews: {
    open: {
      label: 'Open',
      type: 'grid',
      data,
      columns,
      filter: [{ field: 'status', operator: 'equals', value: 'open' }],
      sort: [{ field: 'due_on', order: 'asc' }],
    },
    overdue: {
      label: 'Overdue',
      type: 'grid',
      data,
      columns,
      filter: [
        { field: 'status', operator: 'equals', value: 'open' },
        { field: 'due_on', operator: 'before', value: '{today}' },
      ],
      sort: [{ field: 'due_on', order: 'asc' }],
    },
  },
});
