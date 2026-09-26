import {
  AlignLeftOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  FontSizeOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  NumberOutlined,
} from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import { Button, Divider, Space, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { BASIC_DATA_CONTROLS, DESIGNER_CONTROLS, type DesignerControlType, LAYOUT_CONTROLS } from '../model';

const controlIcons: Record<DesignerControlType, ReactNode> = {
  text: <FontSizeOutlined />,
  textarea: <AlignLeftOutlined />,
  number: <NumberOutlined />,
  date: <CalendarOutlined />,
  singleSelect: <CheckSquareOutlined />,
  multiSelect: <CheckSquareOutlined />,
  group: <AppstoreOutlined />,
  description: <InfoCircleOutlined />,
};

interface DesignerControlPaletteProps {
  onAdd: (control: DesignerControlType) => void;
}

interface DraggableControlProps extends DesignerControlPaletteProps {
  control: DesignerControlType;
}

function DraggableControl({ control, onAdd }: DraggableControlProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${control}`,
    data: { source: 'palette', control },
  });
  const { token } = theme.useToken();
  const definition = DESIGNER_CONTROLS[control];

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <Button block icon={controlIcons[control]} onClick={() => onAdd(control)} style={{ justifyContent: 'flex-start' }}>
        {definition.label}
      </Button>
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`拖动添加${definition.label}`}
        title={`拖动${definition.label}到画布`}
        style={{
          display: 'grid',
          width: 32,
          height: 32,
          flex: '0 0 32px',
          placeItems: 'center',
          border: 0,
          borderRadius: token.borderRadiusSM,
          background: isDragging ? token.colorPrimaryBg : 'transparent',
          color: token.colorTextSecondary,
          cursor: 'grab',
          touchAction: 'none',
        }}
      >
        <HolderOutlined />
      </button>
    </div>
  );
}

export default function DesignerControlPalette({ onAdd }: DesignerControlPaletteProps) {
  return (
    <section aria-label="表单控件" style={{ height: '100%', overflow: 'auto', padding: 16 }}>
      <Typography.Text strong>控件</Typography.Text>
      <Typography.Paragraph type="secondary" style={{ margin: '4px 0 12px' }}>
        点击添加，或拖动右侧手柄到画布
      </Typography.Paragraph>
      <Divider titlePlacement="start" plain style={{ margin: '12px 0 8px' }}>
        基础字段
      </Divider>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {BASIC_DATA_CONTROLS.map((control) => (
          <DraggableControl key={control} control={control} onAdd={onAdd} />
        ))}
      </Space>
      <Divider titlePlacement="start" plain style={{ margin: '20px 0 8px' }}>
        布局控件
      </Divider>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {LAYOUT_CONTROLS.map((control) => (
          <DraggableControl key={control} control={control} onAdd={onAdd} />
        ))}
      </Space>
    </section>
  );
}
