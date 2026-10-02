import { flowFormApi as api } from '@/services';
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { DragModal, DragModalProps, FaHref, FaUtils, Fa, useApiLoading } from '@fa/ui';
import { Button, Form, Input, message } from 'antd';
import { useRef, useState } from 'react';


export interface FormTableCreateModalProps extends DragModalProps {
  fetchFinish?: (v: {tableName: string, comment: string}) => void | Promise<void>;
  addBtn?: boolean;
  editBtn?: boolean;
}

/**
 * FLOW-流程表单实体新增、编辑弹框
 */
export default function FormTableCreateModal({ children, title, fetchFinish, addBtn, editBtn, ...props }: FormTableCreateModalProps) {
  const loading = useApiLoading([ api.getUrl('createFormTable')]);
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);

  const busy = useRef(false);
  /** 新增成功后等待关联/列表更新，再关闭窗口 */
  async function invokeInsertTask(params: any) {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await api.createFormTable(params);
      if (res.status !== Fa.RES_CODE.OK || !res.data) { message.error(res.message || '新增数据表失败'); return; }
      FaUtils.showResponse(res, '新增数据表');
      await fetchFinish?.(res.data);
      form.resetFields();
      setOpen(false);
    } catch { /* 请求或关联层提示错误，保留输入 */ }
    finally { busy.current = false; }
  }

  /** 提交表单 */
  function onFinish(fieldsValue: any) {
    const values = {
      ...fieldsValue,
      config: {},
    };
    invokeInsertTask({ ...values });
  }


  function showModal() {
    setOpen(true)
    // form.setFieldsValue(getInitialValues())
  }

  return (
    <span>
      <span onClick={showModal}>
        {children}
        {addBtn && <Button icon={<PlusOutlined />} type="primary">新建主表</Button>}
        {editBtn && <FaHref icon={<EditOutlined />} text="编辑" />}
      </span>
      <DragModal
        title={title}
        open={open}
        onOk={() => form.submit()}
        confirmLoading={loading}
        onCancel={() => setOpen(false)}
        width={800}
        {...props}
      >
        <Form form={form} onFinish={onFinish} {...FaUtils.formItemFullLayout}>
          <Form.Item name="tableName" label="表名" rules={[{ required: true }, { pattern: /^ff_[a-z][a-z0-9_]*$/, message: '使用 ff_ 前缀和小写英文、数字、下划线' }]} extra="使用业务含义命名，例如 ff_customer_feedback">
            <Input placeholder="ff_customer_feedback" />
          </Form.Item>
          <Form.Item name="comment" label="中文说明" rules={[{ required: true }]}>
            <Input placeholder="客户反馈" />
          </Form.Item>
        </Form>
      </DragModal>
    </span>
  )
}
