import { defineFlow } from '@objectstack/spec';
import { v } from './_cel.js';

// The department mirrors (`asset_department`, `employee_department`) are stored
// on the child record when it is saved, because a department manager's row
// policy cannot hop through a lookup. These two flows keep the stored copies
// current when the source moves to another department.

// The children are rewritten one record at a time: a mirror is a stored
// expression, which the engine computes on a write of one record and leaves
// as it was on a predicate (`multi`) update. Up to 1000 children per object.
const restamp = (id: string, label: string, objectName: string, lookup: string, mirror: string) => [
  {
    id: `find_${id}`,
    type: 'get_record' as const,
    label: `${label}: find them`,
    config: { objectName, filter: { [lookup]: v('record.id') }, limit: 1000, outputVariable: `${id}_rows` },
  },
  {
    id,
    type: 'loop' as const,
    label,
    config: {
      collection: v(`${id}_rows`),
      iteratorVariable: 'child',
      maxIterations: 1000,
      body: {
        nodes: [
          {
            // Contained: a child that refuses the write does not stop the others.
            id: `${id}_try`,
            type: 'try_catch' as const,
            label: 'Move this record',
            config: {
              try: {
                nodes: [
                  {
                    id: `${id}_one`,
                    type: 'update_record' as const,
                    label: 'Store the new department',
                    config: { objectName, filter: { id: v('child.id') }, fields: { [mirror]: v('record.department') } },
                  },
                ],
              },
              catch: { nodes: [{ id: `${id}_handled`, type: 'assignment' as const, label: 'Handled' }] },
            },
          },
        ],
        edges: [],
      },
    },
  },
];

export const AssetDepartmentChangedFlow = defineFlow({
  name: 'asset_department_changed',
  label: 'Asset moved: update department mirrors',
  description: "When an asset moves to another department, its repair orders, scrap requests and depreciation entries follow, so the new department's manager sees them.",
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On asset department changed',
      config: {
        objectName: 'demoasset_asset',
        triggerType: 'record-after-update',
        condition: 'previous.department != record.department',
      },
    },
    ...restamp('repairs', 'Repair orders follow', 'demoasset_repair_order', 'asset', 'asset_department'),
    ...restamp('scrap_requests', 'Scrap requests follow', 'demoasset_disposal_request', 'asset', 'asset_department'),
    ...restamp('depreciation', 'Depreciation entries follow', 'demoasset_depreciation_entry', 'asset', 'asset_department'),
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'find_repairs' },
    { id: 'e2', source: 'find_repairs', target: 'repairs' },
    { id: 'e3', source: 'repairs', target: 'find_scrap_requests' },
    { id: 'e4', source: 'find_scrap_requests', target: 'scrap_requests' },
    { id: 'e5', source: 'scrap_requests', target: 'find_depreciation' },
    { id: 'e6', source: 'find_depreciation', target: 'depreciation' },
    { id: 'e7', source: 'depreciation', target: 'end' },
  ],
});

export const EmployeeDepartmentChangedFlow = defineFlow({
  name: 'employee_department_changed',
  label: 'Employee moved: update department mirrors',
  description: "When an employee moves to another department, their checkouts follow, so the new department's manager sees them.",
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'On employee department changed',
      config: {
        objectName: 'demoasset_employee',
        triggerType: 'record-after-update',
        condition: 'previous.department != record.department',
      },
    },
    ...restamp('checkouts', 'Checkouts follow', 'demoasset_checkout', 'employee', 'employee_department'),
    { id: 'end', type: 'end', label: 'Done' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'find_checkouts' },
    { id: 'e2', source: 'find_checkouts', target: 'checkouts' },
    { id: 'e3', source: 'checkouts', target: 'end' },
  ],
});
