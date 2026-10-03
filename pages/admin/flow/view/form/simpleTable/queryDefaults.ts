import type { Flow } from '@/types';

/** 空默认值不作为条件；0 等非空文本仍保留。 */
export function getDefaultQueryValues(columns: Flow.TableConfigQueryColumn[] = []): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const column of columns) {
    if (column.default !== undefined && column.default !== null && column.default.trim() !== '') {
      if (column.queryType === 'number_range') {
        const parts = column.default.split(/[,，]/);
        values[column.field] = [parts[0]?.trim() || '', parts[1]?.trim() || ''];
        continue;
      }
      values[column.field] = column.multiple || column.queryType === 'in'
        ? [...new Set(column.default.split(/[,，]/).map(value => value.trim()).filter(Boolean))]
        : column.default;
    }
  }
  return values;
}
