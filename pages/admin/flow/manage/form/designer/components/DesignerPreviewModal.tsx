import { Alert, Button, DatePicker, Divider, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import type { DataDesignerItem, DesignerItem } from '../model';
import { getDesignerOptions } from '../model';

interface DesignerPreviewModalProps {
  open: boolean;
  items: DesignerItem[];
  onClose: () => void;
}

function getDataFields(items: DesignerItem[]): DataDesignerItem[] {
  return items.filter((item): item is DataDesignerItem => item.kind === 'field');
}

function getInitialValue(item: DataDesignerItem) {
  const value = item.defaultValue.trim();
  const options = getDesignerOptions(item);
  if (!value) return undefined;

  if (item.control === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  if (item.control === 'date') {
    const date = dayjs(value);
    return date.isValid() ? date : undefined;
  }
  if (item.control === 'singleSelect') return options.includes(value) ? value : undefined;
  if (item.control === 'multiSelect') {
    return value
      .split(/[,，\n]/)
      .map((option) => option.trim())
      .filter((option) => options.includes(option));
  }
  return value;
}

function renderFieldControl(item: DataDesignerItem, disabled = false) {
  const options = getDesignerOptions(item).map((option) => ({ label: option, value: option }));
  switch (item.control) {
    case 'textarea':
      return <Input.TextArea disabled={disabled} rows={3} placeholder={`请输入${item.label}`} />;
    case 'number':
      return <InputNumber disabled={disabled} style={{ width: '100%' }} placeholder={`请输入${item.label}`} />;
    case 'date':
      return <DatePicker disabled={disabled} style={{ width: '100%' }} placeholder={`请选择${item.label}`} />;
    case 'singleSelect':
      return <Select disabled={disabled} placeholder={`请选择${item.label}`} options={options} />;
    case 'multiSelect':
      return (
        <Select
          disabled={disabled}
          mode="multiple"
          placeholder={`请选择${item.label}`}
          options={options}
        />
      );
    default:
      return <Input disabled={disabled} placeholder={`请输入${item.label}`} />;
  }
}

function FormPreview({ items }: { items: DesignerItem[] }) {
  const [form] = Form.useForm();
  const [validated, setValidated] = useState(false);
  const fields = getDataFields(items);
  const initialValues = useMemo(() => Object.fromEntries(fields.map((item) => [item.fieldKey, getInitialValue(item)])), [items]);

  if (items.length === 0) {
    return <Empty description="添加控件后即可预览填报表单" />;
  }

  return (
    <>
      <Alert type="info" showIcon message="可填写并检查必填规则；此预览不会保存数据。" style={{ marginBottom: 16 }} />
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={() => setValidated(true)}
        onValuesChange={() => setValidated(false)}
        scrollToFirstError
      >
        {items.map((item) => {
          if (item.kind === 'layout') {
            return item.control === 'group' ? (
              <Divider key={item.id} titlePlacement="start" plain>
                {item.label}
              </Divider>
            ) : (
              <Typography.Paragraph key={item.id} type="secondary">
                {item.label}
              </Typography.Paragraph>
            );
          }

          return (
            <Form.Item
              key={item.id}
              name={item.fieldKey}
              label={item.label}
              rules={item.required ? [{ required: true, message: `${item.label}为必填项` }] : undefined}
            >
              {renderFieldControl(item)}
            </Form.Item>
          );
        })}
        <Space>
          <Button type="primary" htmlType="submit">
            校验填写
          </Button>
          <Button
            onClick={() => {
              form.resetFields();
              setValidated(false);
            }}
          >
            重置
          </Button>
        </Space>
        {validated && <Alert type="success" showIcon message="填写校验通过，预览数据未保存。" style={{ marginTop: 16 }} />}
      </Form>
    </>
  );
}

function ListPreview({ items }: { items: DesignerItem[] }) {
  const fields = getDataFields(items);
  const columns = fields.map((item) => ({
    title: item.label,
    dataIndex: item.fieldKey,
    key: item.fieldKey,
    ellipsis: true,
  }));

  if (fields.length === 0) {
    return <Empty description="添加数据字段后即可预览默认查询项和列表列" />;
  }

  return (
    <>
      <Typography.Title level={5}>默认查询项</Typography.Title>
      <Typography.Paragraph type="secondary">所有数据字段会作为默认查询项；布局控件不会出现在查询和列表中。</Typography.Paragraph>
      <Form layout="inline" style={{ rowGap: 12, marginBottom: 20 }}>
        {fields.map((item) => (
          <Form.Item key={item.id} label={item.label}>
            {renderFieldControl(item, true)}
          </Form.Item>
        ))}
      </Form>
      <Divider titlePlacement="start" plain>
        默认列表列
      </Divider>
      <Table
        bordered
        size="small"
        columns={columns}
        dataSource={[]}
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无预览数据，仅展示默认列" /> }}
      />
    </>
  );
}

export default function DesignerPreviewModal({ open, items, onClose }: DesignerPreviewModalProps) {
  return (
    <Modal title="表单预览" open={open} onCancel={onClose} footer={null} width={960} destroyOnHidden>
      <Tabs
        defaultActiveKey="form"
        items={[
          { key: 'form', label: '填报预览', children: <FormPreview items={items} /> },
          { key: 'list', label: '列表预览', children: <ListPreview items={items} /> },
        ]}
      />
    </Modal>
  );
}
