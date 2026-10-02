import type { Flow } from '@/types';
import { DragModal, DragModalProps } from '@fa/ui';
import { useState } from 'react';
import { Form, message } from 'antd';
import FaFormShow from '../FaFormShow';


export interface FaFormShowModalProps extends DragModalProps {
  config: Flow.FlowFormConfig;
}

/**
 * Demo-学生表实体新增、编辑弹框
 */
export default function FaFormShowModal({ children, config, ...props }: FaFormShowModalProps) {
  const [form] = Form.useForm();
  const [previewKey, setPreviewKey] = useState(0);
  const [open, setOpen] = useState(false);

  function showModal() {
    form.resetFields();
    setPreviewKey(key => key + 1);
    setOpen(true);
  }

  return (
    <span>
      <span onClick={showModal}>
        {children}
      </span>
      <DragModal
        open={open}
        okText="检查填写"
        onOk={() => form.validateFields().then(() => message.success('填写检查通过，预览数据不会保存')).catch(() => {})}
        onCancel={() => setOpen(false)}
        width={800}
        mask={false}
        style={{ top: 44 }}
        {...props}
      >
        <FaFormShow key={previewKey} form={form} config={config} style={{height: 'calc(100vh - 220px)'}} />
      </DragModal>
    </span>
  );
}
