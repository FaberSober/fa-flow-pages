import { toTemporalValue } from '../form/temporalValues';
import { FaUtils } from '@fa/ui';
import { Flow } from "@/types";
import { cloneDeep, each, get, has, isNil, set } from "lodash";

export function getTableKeyMap(table?: Flow.FlowFormDataConfigTable): Record<string, Flow.FlowFormDataConfigColumn> {
  const mainTableMap = {}
  if (table && table.columns) {
    each(table.columns, (c) => {
      set(mainTableMap, c.field, c)
    })
  }
  return mainTableMap;
}

/** 控件使用数据库字段名，兼容旧驼峰响应；详情空值须覆盖新增默认值。 */
export function normalizeFlowFormValues(flowForm: Flow.FlowForm, values: any) {
  const nextValues = cloneDeep(values || {});
  const columnMap = getTableKeyMap(flowForm.dataConfig?.main);
  function normalize(items: Flow.FlowFormItem[] = [], target = nextValues) {
    each(items, (item) => {
      if (item.type === 'container_row') normalize(item.children, target);
      if (!item.name) return;
      const name = item.name;
      const value = has(target, name) ? get(target, name) : get(target, FaUtils.toHump(name));
      if (item.type === 'high_subtable' && Array.isArray(value)) {
        value.forEach((row) => { normalize(item.children, row); });
        set(target, name, value);
      } else if (isNil(value)) {
        set(target, name, null);
      } else if (item.type === 'datepicker' || item.type === 'timepicker' || columnMap[name]?.dataType === 'date' || columnMap[name]?.dataType === 'datetime') {
        set(target, name, toTemporalValue(item.type === 'timepicker' ? 'timepicker' : 'datepicker', value));
      } else if (item.type === 'select' && item.mode === 'multiple' && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          set(target, name, Array.isArray(parsed) ? parsed : []);
        } catch {
          set(target, name, []);
        }
      } else {
        set(target, name, value);
      }
    });
  }
  normalize(flowForm.config?.items);
  return nextValues;
}

/** 列表和排序始终使用数据库字段名，兼容历史驼峰响应。 */
export function normalizeFlowFormTableValues(flowForm: Flow.FlowForm, records: any[]) {
  return records.map((record) => {
    const values = { ...record };
    each(flowForm.tableConfig?.table?.columns, (column) => {
      if (!Object.hasOwn(values, column.field)) {
        values[column.field] = values[FaUtils.toHump(column.field)];
      }
    });
    return values;
  });
}
