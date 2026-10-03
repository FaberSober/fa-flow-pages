import { flowFormApi } from '@/services';
import { Flow, Flw } from '@/types';
import { useEffect, useState } from 'react';
import { isNil } from 'lodash';
import { FaUtils, PageLoading } from '@fa/ui';
import FaFormShow from './FaFormShow';
import { FormInstance } from 'antd';
import { serializeFormTemporalValues } from '../form/temporalValues';
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
    const values = serializeFormTemporalValues(flowForm?.config?.items, FaUtils.formatDateValues(fieldsValue));
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
