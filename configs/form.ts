export const tailFields = ['flow_instance_id', 'tenant_id', 'crt_time', 'crt_user', 'upd_time', 'upd_user', 'deleted'];

/**
 * 将tailFields中的字段排到最后
 * @param fields 字段列表
 * @returns 排序后的字段列表
 */
export function sortFieldsByTail<T extends { field: string }>(fields: T[]): T[] {
  return fields.sort((a, b) => {
    const indexA = tailFields.indexOf(a.field);
    const indexB = tailFields.indexOf(b.field);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return -1;
    if (indexB === -1) return 1;
    return indexA - indexB;
  });
}

/** 勾选字段时保留已配置属性和拖拽顺序，新字段追加到末尾。 */
export function reconcileSelectedColumns<T extends { field: string; sort: number }, S extends { field: string }>(
  current: T[], selected: S[], create: (field: S, index: number) => T,
): T[] {
  const selectedFields = new Set(selected.map(column => column.field));
  const retained = current.filter(column => selectedFields.has(column.field));
  const retainedFields = new Set(retained.map(column => column.field));
  const added = selected.filter(column => !retainedFields.has(column.field))
    .map((column, index) => create(column, retained.length + index));
  return [...retained, ...added].map((column, sort) => ({ ...column, sort }));
}
