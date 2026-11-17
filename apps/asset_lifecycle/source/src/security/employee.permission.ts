import { definePermissionSet } from '@objectstack/spec';

const hidden = { readable: false, editable: false };

/**
 * Employee (asset holder): the assets they hold, their own checkouts, the
 * repairs they reported and the scrap requests they filed. No money: purchase
 * cost, depreciation and book value are hidden, and so are department budgets
 * and colleagues' home addresses.
 */
export const EmployeePermissions = definePermissionSet({
  name: 'demoasset_employee',
  label: 'Employee (asset holder)',
  description: 'Sees the assets they hold and their own checkouts, repair reports and scrap requests. Sees no asset value.',
  objects: {
    demoasset_department: { allowRead: true },
    demoasset_employee: { allowRead: true },
    demoasset_asset_category: { allowRead: true },
    demoasset_asset: { allowRead: true },
    demoasset_checkout: { allowRead: true },
    demoasset_repair_order: { allowRead: true, allowCreate: true },
    demoasset_disposal_request: { allowRead: true, allowCreate: true },
    // demoasset_depreciation_entry, demoasset_asset_transfer: no grant, so no access.
  },
  fields: {
    'demoasset_asset.purchase_cost': hidden,
    'demoasset_asset.accumulated_depreciation': hidden,
    'demoasset_asset.book_value': hidden,
    'demoasset_disposal_request.written_off_amount': hidden,
    'demoasset_department.asset_budget': hidden,
    'demoasset_employee.home_address': hidden,
  },
  rowLevelSecurity: [
    {
      name: 'employee_assets_held',
      label: 'Assets I hold',
      object: 'demoasset_asset',
      operation: 'select',
      using: 'custodian in current_user.my_employee_ids',
    },
    {
      name: 'employee_own_checkouts',
      label: 'My checkouts',
      object: 'demoasset_checkout',
      operation: 'select',
      using: 'employee in current_user.my_employee_ids',
    },
    {
      name: 'employee_repairs_reported',
      label: 'Repairs I reported',
      object: 'demoasset_repair_order',
      operation: 'select',
      using: 'reported_by in current_user.my_employee_ids',
    },
    {
      name: 'employee_report_repair_as_self',
      label: 'Report a repair as myself',
      object: 'demoasset_repair_order',
      operation: 'insert',
      check: "reported_by in current_user.my_employee_ids && status == 'open'",
    },
    {
      name: 'employee_scrap_requests_filed',
      label: 'Scrap requests I filed',
      object: 'demoasset_disposal_request',
      operation: 'select',
      using: 'requested_by in current_user.my_employee_ids',
    },
    {
      name: 'employee_file_scrap_request_as_self',
      label: 'File a scrap request as myself',
      object: 'demoasset_disposal_request',
      operation: 'insert',
      check: "requested_by in current_user.my_employee_ids && status == 'submitted'",
    },
  ],
});
