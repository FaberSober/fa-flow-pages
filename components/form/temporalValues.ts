import dayjs from 'dayjs';
import type { Flow } from '@/types';

/** 时间控件使用固定日期作为载体，存储值仍只包含时分秒。 */
export function toTemporalValue(type: string, value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const date = type === 'timepicker' && typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)
    ? dayjs(`2000-01-01 ${value}`)
    : dayjs(value as string);
  return date.isValid() ? date : undefined;
}

export function formatTemporalValue(type: string, value: unknown) {
  const date = toTemporalValue(type, value);
  return date ? date.format(type === 'timepicker' ? 'HH:mm:ss' : 'YYYY-MM-DD') : null;
}

/** 递归格式化主子表时间，并显式提交被清空的字段。 */
export function serializeFormTemporalValues(items: Flow.FlowFormItem[] = [], values: Record<string, any>) {
  const result = { ...values };
  for (const item of items) {
    if (item.type === 'container_row') Object.assign(result, serializeFormTemporalValues(item.children, result));
    if (!item.name || !Object.hasOwn(result, item.name)) continue;
    const value = result[item.name];
    if (value === undefined) result[item.name] = null;
    else if (item.type === 'datepicker' || item.type === 'timepicker') {
      result[item.name] = formatTemporalValue(item.type, value);
    } else if (item.type === 'high_subtable' && Array.isArray(value)) {
      result[item.name] = value.map(row => serializeFormTemporalValues(item.children, row));
    }
  }
  return result;
}
