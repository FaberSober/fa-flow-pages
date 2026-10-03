import type { Flow } from '@/types';

const properties = ['dataType', 'length', 'precision', 'scale', 'nullable', 'defaultValue', 'key', 'extra', 'comment'] as const;

/** 排序不算结构变化，空元数据统一按未配置处理。 */
export function getStructureChanges(current: Flow.TableColumnVo[], configured: Flow.TableColumnVo[] = []) {
  const saved = new Map(configured.map(column => [column.field, column]));
  const actual = new Set(current.map(column => column.field));
  return {
    added: current.filter(column => !saved.has(column.field)).map(column => column.field),
    removed: configured.filter(column => !actual.has(column.field)).map(column => column.field),
    changed: current.filter(column => {
      const original = saved.get(column.field);
      return original && properties.some(key => (original[key] ?? null) !== (column[key] ?? null));
    }).map(column => column.field),
  };
}

/** 同步仅更新结构，已有控件和列表属性需要管理员按业务意图调整。 */
export function getMissingStructureBindings(item: Flow.FlowForm, tableName: string, columns: Flow.TableColumnVo[]) {
  const fields = new Set(columns.map(column => column.field));
  const missing: string[] = [];
  function visit(items: Flow.FlowFormItem[] = [], inheritedTable = item.dataConfig?.main?.tableName) {
    for (const control of items) {
      if (control.type === 'high_subtable') {
        visit(control.children, control.subtable_tableName);
        continue;
      }
      const table = control.tableName || inheritedTable;
      if (table === tableName && control.name && !control.type.startsWith('deco_') && control.type !== 'container_row' && !fields.has(control.name)) {
        missing.push(`表单：${control.label || control.name}（${control.name}）`);
      }
      visit(control.children, table);
    }
  }
  visit(item.config?.items);
  if (tableName === item.dataConfig?.main?.tableName) {
    const virtualFields = new Set(['current_node_name', 'current_node_key', 'instance_state']);
    for (const [label, configured] of [['查询', item.tableConfig?.query?.columns], ['列表', item.tableConfig?.table?.columns]] as const) {
      for (const column of configured || []) {
        if (!fields.has(column.field) && !virtualFields.has(column.field)) missing.push(`${label}：${column.label || column.field}（${column.field}）`);
      }
    }
  }
  return [...new Set(missing)];
}
