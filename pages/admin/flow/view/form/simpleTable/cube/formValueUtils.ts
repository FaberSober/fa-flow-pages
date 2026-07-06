import { Flow } from '@/types';
import { FaUtils } from '@fa/ui';
import { each, cloneDeep, get, isNil, set } from 'lodash';
import { getTableKeyMap } from '@features/fa-flow-pages/components/formShow/utils';

function normalizeDateValues(values: any, items: Flow.FlowFormItem[] = [], mainTableMap: Record<string, Flow.FlowFormDataConfigColumn>) {
  each(items, (item) => {
    if (item.children && item.children.length > 0) {
      normalizeDateValues(values, item.children, mainTableMap);
    }

    if (!item.name) return;

    const column = mainTableMap[item.name];
    const value = get(values, item.name);
    if (isNil(value)) return;

    if (item.type === 'datepicker' || item.type === 'timepicker' || column?.dataType === 'date' || column?.dataType === 'datetime') {
      set(values, item.name, FaUtils.getInitialKeyTimeValue(values, item.name));
    }
  });
}

export function normalizeFlowFormValues(flowForm: Flow.FlowForm, values: any) {
  const nextValues = cloneDeep(values || {});
  const mainTableMap = getTableKeyMap(flowForm.dataConfig?.main);

  normalizeDateValues(nextValues, flowForm.config?.items, mainTableMap);

  return nextValues;
}
