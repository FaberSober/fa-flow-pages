import type { Flow } from '@/types';

/** 旧配置不设置范围；清空属性产生的 null 按未配置处理。 */
export function getNumberInputProps(item: Flow.FlowFormItem) {
  const min = item.numberMin ?? undefined;
  const max = item.numberMax ?? undefined;
  return {
    min,
    max: min !== undefined && max !== undefined && max < min ? undefined : max,
    precision: item.numberPrecision ?? undefined,
    step: item.numberStep ?? 1,
  };
}
