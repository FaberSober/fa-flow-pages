import { Form, Select, Switch } from 'antd';
import { useEffect } from 'react';
import { useFlowFormEditStore } from '../../store/useFlowFormEditStore';

/**
 * @author xu.pengfei
 * @date 2025-12-22 20:26:02
 */
export default function TableDetailPanel() {
  const [form] = Form.useForm();
  const { flowForm, updateFlowFormTableConfigTableDetail } = useFlowFormEditStore()

  useEffect(() => {
    const detail = flowForm?.tableConfig?.table?.detail;
    form.setFieldsValue({ ...detail, type: detail?.type ?? 'normal', size: detail?.size ?? 'small',
      bordered: detail?.bordered ?? false, showIndex: detail?.showIndex ?? true });
  }, [flowForm, form]);

  return (
    <Form form={form} className='fa-p12'
      onValuesChange={(_cv, av) => {
        if (!flowForm) return;
        updateFlowFormTableConfigTableDetail({ ...flowForm.tableConfig?.table?.detail, ...av, type: av.type ?? flowForm.tableConfig?.table?.detail?.type ?? 'normal' });
      }}
    >
      <Form.Item name="type" label="表格形式" rules={[{ required: true }]}>
        <Select
          options={[
            { label: '普通表格', value: 'normal' },
            { label: '左侧树表格', value: 'leftTree' },
            { label: '编辑表格', value: 'editTable' },
            { label: '分组表格', value: 'groupTable' },
            { label: '树形表格', value: 'treeTable' },
          ]}
        />
      </Form.Item>
      <Form.Item name="size" label="行高">
        <Select options={[
          { label: '紧凑', value: 'small' },
          { label: '适中', value: 'middle' },
          { label: '宽松', value: 'large' },
        ]} />
      </Form.Item>
      <Form.Item name="bordered" label="显示边框" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="showIndex" label="显示序号" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Form>
  );
}
