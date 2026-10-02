import { ArrowDownOutlined, ArrowUpOutlined, HolderOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Card, DatePicker, Input, InputNumber, Select, Space, Tag, Typography, theme } from 'antd';
import { type DesignerItem, getControlLabel, getDesignerOptions } from '../model';

interface DesignerItemCardProps {
  item: DesignerItem;
  selected: boolean;
  position: number;
  count: number;
  onSelect: () => void;
  onMove: (offset: -1 | 1) => void;
}

function ItemPreview({ item }: { item: DesignerItem }) {
  if (item.kind === 'layout') {
    return (
      <div style={{ padding: '10px 12px', border: '1px dashed var(--ant-color-border)', borderRadius: 6 }}>
        <Typography.Text type="secondary">{item.control === 'group' ? '分组容器' : item.label}</Typography.Text>
      </div>
    );
  }

  switch (item.control) {
    case 'text':
      return <Input disabled placeholder={`请输入${item.label}`} />;
    case 'textarea':
      return <Input.TextArea disabled rows={2} placeholder={`请输入${item.label}`} />;
    case 'number':
      return <InputNumber disabled style={{ width: '100%' }} placeholder={`请输入${item.label}`} />;
    case 'date':
      return <DatePicker disabled style={{ width: '100%' }} placeholder={`请选择${item.label}`} />;
    case 'singleSelect':
      return (
        <Select
          disabled
          style={{ width: '100%' }}
          placeholder={`请选择${item.label}`}
          options={getDesignerOptions(item).map((option) => ({ label: option, value: option }))}
        />
      );
    case 'multiSelect':
      return (
        <Select
          disabled
          mode="multiple"
          style={{ width: '100%' }}
          placeholder={`请选择${item.label}`}
          options={getDesignerOptions(item).map((option) => ({ label: option, value: option }))}
        />
      );
  }

  return null;
}

export default function DesignerItemCard({ item, selected, position, count, onSelect, onMove }: DesignerItemCardProps) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { source: 'canvas', itemId: item.id },
  });
  const { token } = theme.useToken();

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      <Card
        size="small"
        onClick={onSelect}
        style={{
          borderColor: selected ? token.colorPrimary : token.colorBorderSecondary,
          boxShadow: selected ? `0 0 0 1px ${token.colorPrimary}` : undefined,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`拖动排序：${item.label}`}
            title="拖动排序"
            style={{ border: 0, background: 'transparent', color: token.colorTextSecondary, cursor: 'grab', touchAction: 'none' }}
          >
            <HolderOutlined />
          </button>
          <Button type="link" aria-pressed={selected} style={{ flex: 1, padding: 0, textAlign: 'left' }}>
            {item.label}
            {item.kind === 'field' && item.required && <Typography.Text type="danger"> *</Typography.Text>}
          </Button>
          <Space.Compact>
            <Button size="small" type="text" icon={<ArrowUpOutlined />} aria-label={`上移${item.label}`} disabled={position === 0} onClick={() => onMove(-1)} />
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              aria-label={`下移${item.label}`}
              disabled={position === count - 1}
              onClick={() => onMove(1)}
            />
          </Space.Compact>
        </div>
        {item.kind === 'field' ? (
          <>
            <Space size={6} style={{ marginBottom: 8 }}>
              <Tag>{getControlLabel(item.control)}</Tag>
              {item.required && <Tag color="red">必填</Tag>}
            </Space>
            <ItemPreview item={item} />
          </>
        ) : (
          <ItemPreview item={item} />
        )}
      </Card>
    </div>
  );
}
