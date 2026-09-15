import { Flow, FlowEnums, Flw } from '@/types';
import DemoFlowLeaveForm from '@features/fa-flow-pages/pages/admin/demo/flow/form/leave/modal/DemoFlowLeaveForm';
import React from 'react';
import FaFlowForm from './FaFlowForm';
import { FormInstance } from 'antd';
import { FaUtils } from '@fa/ui';

export interface FaFlowFormCreateProps {
  flow: Flow.FlowProcess;
  form: FormInstance<any>;
  startNode: Flw.Node;
  onFormSubmit: (flow: Flow.FlowProcess, formValues: any, requestId: string) => Promise<unknown>;
  onLoadingChange?: (loading: boolean) => void;
}

/**
 * @author xu.pengfei
 * @date 2026-01-12 17:15:23
 */
export default function FaFlowFormCreate({ flow, form, startNode, onFormSubmit, onLoadingChange }: FaFlowFormCreateProps) {
  const requestIdRef = React.useRef<string | undefined>(undefined);

  function handleFormSuccess(formValues: any) {
    const requestId = requestIdRef.current ?? (requestIdRef.current = FaUtils.uuid());
    const result = onFormSubmit(flow, formValues, requestId);
    return Promise.resolve(result).then(() => {
      requestIdRef.current = undefined;
    });
  }

  return (
    <div className='fa-full fa-relative'>
      {/* 系统表单 */}
      {flow.processKey.startsWith('testLeave') && (<DemoFlowLeaveForm form={form} onSuccess={handleFormSuccess} onLoadingChange={onLoadingChange} />)}
      {/* 自定义表单 */}
      {flow.formType === FlowEnums.FlowProcessFormType.CUSTOM && (
        <div className='fa-full-content'>
          <FaFlowForm
            formId={flow.formId}
            form={form}
            flowNode={startNode}
            onSuccess={handleFormSuccess}
            onLoadingChange={onLoadingChange}
          />
        </div>
      )}
    </div>
  );
}
