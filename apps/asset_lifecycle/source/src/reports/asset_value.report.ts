import { defineReport } from '@objectstack/spec/ui';

/** Asset count and book value by category (down) and department (across). */
export const AssetValueByCategoryDepartmentReport = defineReport({
  name: 'asset_value_by_category_department',
  label: 'Asset Count and Book Value by Category and Department',
  description: 'How many assets each department holds in each category, and what they are worth on the books.',
  type: 'matrix',
  dataset: 'asset_value',
  rows: ['category'],
  columns: ['department'],
  values: ['asset_count', 'book_value_sum'],
  exportOptions: { formats: ['csv', 'xlsx'] },
  chart: { type: 'bar', xAxis: 'category', yAxis: 'book_value_sum', seriesBy: 'department' },
});
