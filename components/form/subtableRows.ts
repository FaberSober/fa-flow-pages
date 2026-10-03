import type { Flow } from '@/types';

/** 复制配置内的业务字段，记录标识和系统元数据由新记录生成。 */
export function copySubtableRow(row: Record<string, unknown>, children: Flow.FlowFormItem[], key: string, systemFields: string[]) {
  const excluded = new Set(['id', ...systemFields]);
  const copy: Record<string, unknown> = { _key: key };
  for (const child of children) {
    const name = child.name || child.id;
    if (name.startsWith('_') || excluded.has(name.toLowerCase())) continue;
    copy[name] = structuredClone(row[name]);
  }
  return copy;
}
