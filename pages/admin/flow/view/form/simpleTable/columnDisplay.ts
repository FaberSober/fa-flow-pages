import type { Flow } from '@/types';
import { toBooleanFormValue } from '@features/fa-flow-pages/components/form/booleanValues';

/** 只映射主表字段，子表内同名字段不能覆盖主表显示配置。 */
export function getMainFormFieldMap(items: Flow.FlowFormItem[] = []): Map<string, Flow.FlowFormItem> {
  const result = new Map<string, Flow.FlowFormItem>();
  for (const item of items) {
    if (item.type === 'container_row') {
      for (const [name, child] of getMainFormFieldMap(item.children)) result.set(name, child);
    } else if (item.type !== 'high_subtable' && item.name) result.set(item.name, item);
  }
  return result;
}

export function formatFormColumnValue(item: Flow.FlowFormItem, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (item.type === 'switch' || item.type === 'checkbox') return toBooleanFormValue(value) ? '是' : '否';
  function label(optionValue: unknown) {
    const option = item.options?.find(option => option.value === optionValue)
      ?? item.options?.find(option => String(option.value) === String(optionValue));
    return option?.label || String(optionValue);
  }
  if (item.type === 'select' && (item.mode === 'multiple' || item.mode === 'tags')) {
    let selected = value;
    if (typeof value === 'string') {
      try { selected = JSON.parse(value); } catch { return value; }
    }
    return Array.isArray(selected) ? selected.map(label).join('、') || '—' : String(value);
  }
  return label(value);
}
