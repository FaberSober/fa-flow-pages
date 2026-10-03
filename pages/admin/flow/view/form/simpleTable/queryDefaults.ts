import type { Flow } from '@/types';

/** 空默认值不作为条件；0 等非空文本仍保留。 */
export function getDefaultQueryValues(columns: Flow.TableConfigQueryColumn[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  for (const column of columns) {
    if (column.default !== undefined && column.default !== null && column.default.trim() !== '') {
      values[column.field] = column.default;
    }
  }
  return values;
}
