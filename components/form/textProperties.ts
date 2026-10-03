import type { Flow } from '@/types';

export function getTextInputProps(item: Flow.FlowFormItem) {
  const length = item.textMaxLength;
  const maxLength = typeof length === 'number' && Number.isFinite(length) && length >= 1 ? Math.floor(length) : undefined;
  return { maxLength, showCount: maxLength !== undefined };
}

/** 未配置时保留主表/子表各自原来的行数。 */
export function getTextAreaRows(item: Flow.FlowFormItem, defaultRows: number) {
  const rows = item.textRows;
  return typeof rows === 'number' && Number.isFinite(rows)
    ? Math.max(2, Math.min(12, Math.floor(rows))) : defaultRows;
}
