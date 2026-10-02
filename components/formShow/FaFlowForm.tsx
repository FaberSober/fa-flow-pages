import { flowFormApi } from '@/services';
import { Flow, Flw } from '@/types';
import { useEffect, useState } from 'react';
import { each, isNil } from 'lodash';
import { FaUtils, PageLoading } from '@fa/ui';
import FaFormShow from './FaFormShow';
import { FormInstance } from 'antd';
import { normalizeFlowFormValues } from './utils';

export interface FaFlowFormProps<T = any> {
  formId: any;
  form: FormInstance<any>;
  flowNode?: Flw.Node;
  record?: T;
  onSuccess?: (record: T) => void;
  onLoadingChange?: (loading: boolean) => void;
  disabled?: boolean;
}

/**
 * @author xu.pengfei
 * @date 2025-12-18 11:28:43
 */
export default function FaFlowForm({ formId, form, flowNode, record, onSuccess, disabled }: FaFlowFormProps) {
  const [flowForm, setFlowForm] = useState<Flow.FlowForm>();

  useEffect(() => {
    if (record && flowForm) {
      form.setFieldsValue(normalizeFlowFormValues(flowForm, record));
    }
  }, [record, flowForm]);

  useEffect(() => {
    if (formId) {
      flowFormApi.getById(formId).then((res) => {
        setFlowForm(res.data);
      });
    }
  }, [formId]);

  function onFinish(fieldsValue: any) {
    const values = FaUtils.formatDateValues(fieldsValue);
    // 清空字段显式提交 null，避免 JSON 丢失 undefined 后无法清除旧数据。
    function normalizeSubmitted(items: Flow.FlowFormItem[] = []) {
      each(items, (item) => {
        if (item.type === 'container_row') normalizeSubmitted(item.children);
        if (!item.name || !Object.hasOwn(values, item.name)) return;
        if (values[item.name] === undefined) values[item.name] = null;
        if (item.type === 'datepicker' && fieldsValue[item.name]?.format) {
          values[item.name] = fieldsValue[item.name].format('YYYY-MM-DD');
        }
      });
    }
    normalizeSubmitted(flowForm?.config?.items);
    // 数据请求由调用方负责，新增和编辑均只回传当前表单值。
    onSuccess?.({ ...record, _formId: formId, ...values });
  }

  if (isNil(flowForm)) return <PageLoading />;
  return (
    <div className='fa-full fa-relative'>
      {formId && (
        <FaFormShow
          config={flowForm.config}
          flowNode={flowNode}
          form={form}
          onFinish={onFinish}
          disabled={disabled}
        />
      )}
    </div>
  );
}
