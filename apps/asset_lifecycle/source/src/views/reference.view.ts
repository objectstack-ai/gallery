import { defineView } from '@objectstack/spec';

export const DepreciationEntryViews = defineView({
  list: {
    label: 'All Depreciation Entries',
    type: 'grid',
    data: { provider: 'object', object: 'demoasset_depreciation_entry' },
    columns: [
      { field: 'period', link: true },
      { field: 'asset' },
      { field: 'kind' },
      { field: 'amount', align: 'right', summary: 'sum' },
      { field: 'posted_on' },
    ],
    sort: [{ field: 'period', order: 'desc' }],
    pagination: { pageSize: 100 },
    // Posted by the month-end run; never edited by hand.
    userActions: { editInline: false },
  },
});

export const AssetCategoryViews = defineView({
  list: {
    label: 'All Asset Categories',
    type: 'grid',
    data: { provider: 'object', object: 'demoasset_asset_category' },
    columns: [
      { field: 'name', link: true },
      { field: 'useful_life_months' },
      { field: 'depreciation_method' },
    ],
    sort: [{ field: 'name', order: 'asc' }],
  },
});

export const DepartmentViews = defineView({
  list: {
    label: 'All Departments',
    type: 'grid',
    data: { provider: 'object', object: 'demoasset_department' },
    columns: [
      { field: 'name', link: true },
      { field: 'manager' },
      { field: 'asset_budget', align: 'right' },
    ],
    sort: [{ field: 'name', order: 'asc' }],
  },
});

export const EmployeeViews = defineView({
  list: {
    label: 'All Employees',
    type: 'grid',
    data: { provider: 'object', object: 'demoasset_employee' },
    columns: [
      { field: 'name', link: true },
      { field: 'title' },
      { field: 'department' },
      { field: 'user' },
      { field: 'home_address' },
    ],
    sort: [{ field: 'name', order: 'asc' }],
  },
});
