// Capabilities this app defines. A permission set grants one through
// `systemPermissions`; an action or flow asks for one through `requiredPermissions`.
export const capabilities = [
  {
    name: 'demoasset.manage_assets',
    label: 'Manage assets',
    description:
      'Check assets out and in, file or cancel a transfer to another department, and dispose of an asset once its scrap request is approved.',
  },
  {
    name: 'demoasset.decide_scrap',
    label: 'Decide scrap requests',
    description: 'Approve or reject the scrap requests of the assets of the department one manages.',
  },
  {
    name: 'demoasset.decide_transfer',
    label: 'Decide asset transfers',
    description: 'Approve or reject the transfers of assets into the department one manages.',
  },
];
