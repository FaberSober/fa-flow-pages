import type { TableColumnsType } from 'antd';
import { Alert, Button, Empty, Modal, Table, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import type { DataDesignerItem, DesignerItem } from '../model';
import { DESIGNER_CONTROLS } from '../model';

interface DesignerPublishCheckModalProps {
  open: boolean;
  items: DesignerItem[];
  onClose: () => void;
}

function getOptions(item: DataDesignerItem) {
  return Array.isArray(item.options)
    ? item.options
        .filter((option) => typeof option === 'string')
        .map((option) => option.trim())
        .filter(Boolean)
    : [];
}

function checkItems(items: DesignerItem[]) {
  const fields = items.filter((item): item is DataDesignerItem => item.kind === 'field');
  const issues: string[] = [];

  if (fields.length === 0) {
    issues.push('至少添加一个数据字段。');
  }

  fields.forEach((field, index) => {
    const label = typeof field.label === 'string' ? field.label.trim() : '';
    const fieldName = label || `第 ${index + 1} 个数据字段`;
    if (!label) issues.push(`${fieldName}需要填写字段名称。`);

    if (field.control !== 'singleSelect' && field.control !== 'multiSelect') return;
    const options = getOptions(field);
    if (options.length === 0) {
      issues.push(`${fieldName}至少需要一个有效选项。`);
    } else if (new Set(options).size !== options.length) {
      issues.push(`${fieldName}包含重复选项。`);
    }
  });

  return { fields, issues };
}

const columns: TableColumnsType<DataDesignerItem> = [
  { title: '字段名称', dataIndex: 'label', key: 'label' },
  {
    title: '字段类型',
    key: 'control',
    render: (_, item) => DESIGNER_CONTROLS[item.control].label,
  },
  {
    title: '必填',
    dataIndex: 'required',
    key: 'required',
    render: (required: boolean) => (required ? <Tag color="red">必填</Tag> : <Typography.Text type="secondary">选填</Typography.Text>),
  },
  {
    title: '选项',
    key: 'options',
    render: (_, item) =>
      item.control === 'singleSelect' || item.control === 'multiSelect' ? (
        `${getOptions(item).length} 项`
      ) : (
        <Typography.Text type="secondary">—</Typography.Text>
      ),
  },
];

export default function DesignerPublishCheckModal({ open, items, onClose }: DesignerPublishCheckModalProps) {
  const { fields, issues } = useMemo(() => checkItems(items), [items]);

  return (
    <Modal title="发布前检查" open={open} onCancel={onClose} footer={<Button onClick={onClose}>关闭</Button>} width={720}>
      <Alert
        showIcon
        type={issues.length > 0 ? 'warning' : 'success'}
        message={issues.length > 0 ? '发现需要完善的配置' : '配置检查通过'}
        description={
          issues.length > 0 ? (
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {issues.map((issue, index) => (
                <li key={`${index}-${issue}`}>{issue}</li>
              ))}
            </ul>
          ) : (
            `当前有 ${fields.length} 个数据字段，可以进入后续发布步骤。`
          )
        }
        style={{ marginBottom: 16 }}
      />
      <Typography.Text strong>字段摘要</Typography.Text>
      {fields.length > 0 ? (
        <Table<DataDesignerItem> rowKey="id" size="small" pagination={false} columns={columns} dataSource={fields} style={{ marginTop: 12 }} />
      ) : (
        <Empty description="还没有可发布的数据字段" style={{ margin: '24px 0' }} />
      )}
      <Alert
        type="info"
        showIcon
        message="此步骤只检查配置并展示摘要，不会创建或修改数据库表。实际发布将在后续发布功能中接入。"
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
}
