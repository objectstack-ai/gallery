import { definePermissionSet } from '@objectstack/spec';

/**
 * IT asset administrator, organization-wide: registers assets, checks them out
 * and in, runs repairs, files transfers between departments and disposes of
 * assets whose scrap request is approved.
 * Sees every asset and employees' home addresses (to ship equipment), but no
 * department's asset budget. Cannot decide a scrap request or a transfer.
 */
export const AssetAdminPermissions = definePermissionSet({
  name: 'demoasset_asset_admin',
  label: 'IT asset administrator',
  description: 'Registers, checks out, repairs and disposes of assets across the organization. Sees no department budget.',
  objects: {
    demoasset_department: { allowRead: true },
    demoasset_employee: { allowRead: true },
    demoasset_asset_category: { allowRead: true, allowCreate: true, allowEdit: true },
    demoasset_asset: { allowRead: true, allowCreate: true, allowEdit: true },
    demoasset_checkout: { allowRead: true, allowCreate: true, allowEdit: true },
    demoasset_repair_order: { allowRead: true, allowCreate: true, allowEdit: true },
    demoasset_disposal_request: { allowRead: true, allowCreate: true, allowEdit: true },
    demoasset_asset_transfer: { allowRead: true, allowCreate: true, allowEdit: true },
    demoasset_depreciation_entry: { allowRead: true },
  },
  fields: {
    'demoasset_department.asset_budget': { readable: false, editable: false },
  },
  systemPermissions: ['demoasset.manage_assets'],
  rowLevelSecurity: [
    {
      // A disposed asset is closed: nobody edits it, and only the disposal of
      // an approved scrap request (a system step) may set that status.
      name: 'admin_no_edit_of_disposed_assets',
      label: 'Disposed assets are closed',
      object: 'demoasset_asset',
      operation: 'update',
      using: "status != 'disposed'",
      check: "status != 'disposed'",
    },
    {
      name: 'admin_file_scrap_request',
      label: 'File a scrap request',
      object: 'demoasset_disposal_request',
      operation: 'insert',
      check: "status == 'submitted'",
    },
    {
      // The administrator never decides a request: they only complete
      // (dispose of) one a department manager already approved.
      name: 'admin_complete_approved_scrap_requests',
      label: 'Dispose of approved scrap requests',
      object: 'demoasset_disposal_request',
      operation: 'update',
      using: "status == 'approved'",
      check: "status in ['approved', 'completed']",
    },
    {
      name: 'admin_file_asset_transfer',
      label: 'File an asset transfer',
      object: 'demoasset_asset_transfer',
      operation: 'insert',
      check: "status == 'submitted'",
    },
    {
      // The administrator never decides a transfer: they only withdraw one
      // that the receiving manager has not decided yet.
      name: 'admin_cancel_pending_asset_transfers',
      label: 'Cancel pending asset transfers',
      object: 'demoasset_asset_transfer',
      operation: 'update',
      using: "status == 'submitted'",
      check: "status == 'cancelled'",
    },
  ],
});
