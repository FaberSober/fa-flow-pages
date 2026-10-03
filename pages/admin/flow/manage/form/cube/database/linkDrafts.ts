import type { Flow } from '@/types';

export function getLinkEditableValues(row: Flow.FlowFormTable) {
  return { sort: row.sort, remark: row.remark, foreignKey: row.foreignKey, referenceKey: row.referenceKey };
}

export function hasLinkChanges(row: Flow.FlowFormTable, saved?: Flow.FlowFormTable) {
  return !saved || row.sort !== saved.sort || row.remark !== saved.remark
    || row.foreignKey !== saved.foreignKey || row.referenceKey !== saved.referenceKey;
}

/** 新增/删除后的刷新保留其他行未提交的输入，不覆盖新结构元数据。 */
export function mergeLinkDrafts(next: Flow.FlowFormTable[], saved: Flow.FlowFormTable[], drafts: Flow.FlowFormTable[]) {
  return next.map(row => {
    const draft = drafts.find(item => item.id === row.id);
    const original = saved.find(item => item.id === row.id);
    return draft && hasLinkChanges(draft, original) ? { ...row, ...getLinkEditableValues(draft) } : row;
  });
}
