import { tailFields } from '@features/fa-flow-pages/configs/form';
import type { Flow } from '@/types';

export interface FormFieldSource {
  tableName: string;
  label: string;
  columns: Flow.TableColumnVo[];
  foreignKey?: string;
  subtable?: boolean;
  disabledReason?: string;
}

export function getColumnControlType(column: Flow.TableColumnVo): Flow.FlowFormItemType | undefined {
  const type = (column.dataType || column.type || '')
    .toLowerCase()
    .replace(/\(.*\)/, '')
    .trim();
  if (['varchar', 'char', 'character varying', 'character'].includes(type)) return 'input';
  if (['text', 'tinytext', 'mediumtext', 'longtext'].includes(type)) return 'textarea';
  if (['int', 'integer', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'double', 'double precision', 'real'].includes(type))
    return 'inputnumber';
  if (type === 'date') return 'datepicker';
  if (type === 'boolean') return 'switch';
  return undefined;
}

export function getBusinessColumns(source: FormFieldSource) {
  return source.columns.filter(
    (column) =>
      !['id', ...tailFields, source.foreignKey?.toLowerCase()].includes(column.field.toLowerCase()) &&
      column.key !== 'PRI' &&
      !column.extra?.toLowerCase().includes('auto_increment') &&
      !column.extra?.toLowerCase().includes('generated'),
  );
}

export function createColumnControl(column: Flow.TableColumnVo, tableName: string, id: string): Flow.FlowFormItem {
  const type = getColumnControlType(column);
  if (!type) throw new Error(`暂不支持自动生成字段：${column.field}`);
  const item: Flow.FlowFormItem = {
    id,
    type,
    tableName,
    name: column.field,
    label: column.comment || column.field,
    md: type === 'textarea' ? 24 : 12,
    rules: column.nullable === 'NO' ? [{ required: true }] : [],
  };
  if (column.defaultValue != null && !column.defaultExpression) {
    if (type === 'inputnumber' && column.defaultValue.trim() !== '' && Number.isFinite(Number(column.defaultValue)))
      item.initialValue = Number(column.defaultValue);
    if (type === 'input' || type === 'textarea') item.initialValue = column.defaultValue;
  }
  return item;
}

export function getBoundFields(items: Flow.FlowFormItem[], source: FormFieldSource): Set<string> {
  const fields = new Set<string>();
  const visit = (nodes: Flow.FlowFormItem[], inheritedTable?: string) => {
    for (const item of nodes) {
      const table = item.tableName || inheritedTable;
      if (item.name && table === source.tableName && item.type !== 'high_subtable') fields.add(item.name);
      visit(item.children || [], item.type === 'high_subtable' ? item.subtable_tableName : table);
    }
  };
  visit(items, source.subtable ? undefined : source.tableName);
  return fields;
}

/** 只追加未绑定字段，不覆盖现有控件、标题或布局。 */
export function appendSourceFields(items: Flow.FlowFormItem[], source: FormFieldSource, fields: string[], makeId: () => string): Flow.FlowFormItem[] {
  const bound = getBoundFields(items, source);
  const controls = getBusinessColumns(source)
    .filter((column) => fields.includes(column.field) && !bound.has(column.field) && getColumnControlType(column))
    .map((column) => createColumnControl(column, source.tableName, makeId()));
  if (!controls.length) return items;
  if (!source.subtable) return [...items, ...controls];
  let found = false;
  const append = (nodes: Flow.FlowFormItem[]): Flow.FlowFormItem[] =>
    nodes.map((item) => {
      if (!found && item.type === 'high_subtable' && item.subtable_tableName === source.tableName) {
        found = true;
        return { ...item, children: [...(item.children || []), ...controls] };
      }
      return item.children ? { ...item, children: append(item.children) } : item;
    });
  const result = append(items);
  if (found) return result;
  const names = new Set<string>();
  const collectNames = (nodes: Flow.FlowFormItem[]) => {
    for (const item of nodes) {
      if (item.name) names.add(item.name);
      if (item.type === 'container_row') collectNames(item.children || []);
    }
  };
  collectNames(items);
  let name = source.tableName;
  for (let suffix = 2; names.has(name); suffix++) name = `${source.tableName}_${suffix}`;
  return [...items, { id: makeId(), type: 'high_subtable', md: 24, name, label: source.label, subtable_tableName: source.tableName, children: controls }];
}
