import { definePermissionSet } from '@objectstack/spec';

/**
 * Department manager: their department, its people and its assets, their
 * people's checkouts, and the repairs, scrap requests and depreciation of the
 * department's assets, and the transfers of assets out of and into the
 * department. Decides the scrap requests and the incoming transfers that name
 * them as approver.
 */
export const DeptManagerPermissions = definePermissionSet({
  name: 'demoasset_dept_manager',
  label: 'Department manager',
  description: 'Sees the assets, people and asset records of their own department, and decides its scrap requests and incoming asset transfers.',
  objects: {
    demoasset_department: { allowRead: true },
    demoasset_employee: { allowRead: true },
    demoasset_asset_category: { allowRead: true },
    demoasset_asset: { allowRead: true },
    demoasset_checkout: { allowRead: true },
    demoasset_repair_order: { allowRead: true, allowCreate: true },
    demoasset_disposal_request: { allowRead: true, allowCreate: true, allowEdit: true },
    demoasset_asset_transfer: { allowRead: true, allowEdit: true },
    demoasset_depreciation_entry: { allowRead: true },
  },
  fields: {
    'demoasset_employee.home_address': { readable: false, editable: false },
    // A manager sees the value of their department's assets (the roll-up covers
    // only depreciation entries of assets they can already read).
    'demoasset_asset.accumulated_depreciation': { readable: true, editable: false },
  },
  systemPermissions: ['demoasset.decide_scrap', 'demoasset.decide_transfer'],
  rowLevelSecurity: [
    {
      name: 'manager_own_department',
      label: 'My department',
      object: 'demoasset_department',
      operation: 'select',
      using: 'id in current_user.my_department_ids',
    },
    {
      name: 'manager_department_people',
      label: 'People of my department',
      object: 'demoasset_employee',
      operation: 'select',
      using: 'department in current_user.my_department_ids',
    },
    {
      name: 'manager_department_assets',
      label: 'Assets of my department',
      object: 'demoasset_asset',
      operation: 'select',
      using: 'department in current_user.my_department_ids',
    },
    {
      name: 'manager_people_checkouts',
      label: 'Checkouts of my people',
      object: 'demoasset_checkout',
      operation: 'select',
      using: 'employee_department in current_user.my_department_ids',
    },
    {
      name: 'manager_department_repairs',
      label: 'Repairs of my department\'s assets',
      object: 'demoasset_repair_order',
      operation: 'select',
      using: 'asset_department in current_user.my_department_ids',
    },
    {
      name: 'manager_report_repair_as_self',
      label: 'Report a repair as myself',
      object: 'demoasset_repair_order',
      operation: 'insert',
      check: "reported_by in current_user.my_employee_ids && status == 'open'",
    },
    {
      name: 'manager_department_scrap_requests',
      label: 'Scrap requests of my department\'s assets',
      object: 'demoasset_disposal_request',
      operation: 'select',
      using: 'asset_department in current_user.my_department_ids',
    },
    {
      name: 'manager_file_scrap_request_as_self',
      label: 'File a scrap request as myself',
      object: 'demoasset_disposal_request',
      operation: 'insert',
      check: "requested_by in current_user.my_employee_ids && status == 'submitted'",
    },
    {
      // Deciding: only a submitted request that names this manager as approver,
      // and only to approve or reject it. Disposal stays with the asset administrator.
      name: 'manager_decide_scrap_requests',
      label: 'Decide the scrap requests I hold',
      object: 'demoasset_disposal_request',
      operation: 'update',
      using: "asset_department in current_user.my_department_ids && approver in current_user.my_employee_ids && status == 'submitted'",
      check: "status in ['submitted', 'approved', 'rejected']",
    },
    {
      name: 'manager_department_depreciation',
      label: 'Depreciation of my department\'s assets',
      object: 'demoasset_depreciation_entry',
      operation: 'select',
      using: 'asset_department in current_user.my_department_ids',
    },
    {
      name: 'manager_department_asset_transfers',
      label: 'Transfers out of and into my department',
      object: 'demoasset_asset_transfer',
      operation: 'select',
      using: 'from_department in current_user.my_department_ids || to_department in current_user.my_department_ids',
    },
    {
      // Deciding: only a submitted transfer into this manager's department that
      // names them as approver, and only to approve or reject it. The write
      // must leave the transfer theirs, so it cannot be redirected elsewhere.
      name: 'manager_decide_incoming_asset_transfers',
      label: 'Decide the incoming transfers I hold',
      object: 'demoasset_asset_transfer',
      operation: 'update',
      using: "to_department in current_user.my_department_ids && approver in current_user.my_employee_ids && status == 'submitted'",
      check: "to_department in current_user.my_department_ids && approver in current_user.my_employee_ids && status in ['approved', 'rejected']",
    },
  ],
});
