import { App } from '@objectstack/spec/ui';

/**
 * The Asset Lifecycle app: the one app of this package. Every role opens the
 * same navigation; what each entry lists is decided by the role's permission
 * set (an entry whose object the role cannot read shows nothing).
 */
const mainApp = App.create({
  name: 'demoasset_main_app',
  label: 'Asset Lifecycle',
  icon: 'laptop',
  navigation: [
    { id: 'nav_asset', type: 'object', objectName: 'demoasset_asset', label: 'Assets', icon: 'laptop' },
    { id: 'nav_checkout', type: 'object', objectName: 'demoasset_checkout', label: 'Checkouts', icon: 'arrow-right-left' },
    { id: 'nav_repair_order', type: 'object', objectName: 'demoasset_repair_order', label: 'Repair Orders', icon: 'wrench' },
    { id: 'nav_disposal_request', type: 'object', objectName: 'demoasset_disposal_request', label: 'Scrap Requests', icon: 'trash-2' },
    { id: 'nav_asset_transfer', type: 'object', objectName: 'demoasset_asset_transfer', label: 'Asset Transfers', icon: 'arrow-left-right' },
    {
      id: 'nav_asset_value_by_category',
      type: 'dashboard',
      dashboardName: 'demoasset_asset_value_by_category',
      label: 'Asset Value by Category',
      icon: 'chart-bar',
    },
    {
      id: 'nav_asset_value_report',
      type: 'report',
      reportName: 'asset_value_by_category_department',
      label: 'Count and Book Value Report',
      icon: 'table',
    },
    {
      id: 'group_reference',
      type: 'group',
      label: 'Reference',
      icon: 'settings',
      children: [
        {
          id: 'nav_depreciation_entry',
          type: 'object',
          objectName: 'demoasset_depreciation_entry',
          label: 'Depreciation Entries',
          icon: 'trending-down',
        },
        { id: 'nav_asset_category', type: 'object', objectName: 'demoasset_asset_category', label: 'Asset Categories', icon: 'tags' },
        { id: 'nav_department', type: 'object', objectName: 'demoasset_department', label: 'Departments', icon: 'building-2' },
        { id: 'nav_employee', type: 'object', objectName: 'demoasset_employee', label: 'Employees', icon: 'users' },
      ],
    },
  ],
});

export default mainApp;
