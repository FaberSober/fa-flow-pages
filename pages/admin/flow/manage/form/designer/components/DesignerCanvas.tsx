import { InboxOutlined } from '@ant-design/icons';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Empty, Space, Typography, theme } from 'antd';
import type { DesignerItem } from '../model';
import DesignerItemCard from './DesignerItemCard';

export const DESIGNER_CANVAS_DROP_ID = 'designer-canvas';

interface DesignerCanvasProps {
  items: DesignerItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onMove: (id: string, offset: -1 | 1) => void;
}

export default function DesignerCanvas({ items, selectedId, onSelect, onMove }: DesignerCanvasProps) {
  const { setNodeRef } = useDroppable({ id: DESIGNER_CANVAS_DROP_ID });
  const { over } = useDndContext();
  const isOver = over?.id === DESIGNER_CANVAS_DROP_ID || items.some((item) => item.id === String(over?.id));
  const { token } = theme.useToken();

  return (
    <main aria-label="表单画布" style={{ height: '100%', minWidth: 0, padding: 24, background: token.colorFillQuaternary }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxWidth: 920,
          margin: '0 auto',
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          background: token.colorBgContainer,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '16px 20px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <InboxOutlined style={{ color: token.colorPrimary }} />
          <Typography.Text strong>表单画布</Typography.Text>
          <Typography.Text type="secondary">{items.length} 个控件</Typography.Text>
        </div>
        <div
          ref={setNodeRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: 20,
            background: isOver ? token.colorPrimaryBg : token.colorBgContainer,
          }}
        >
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {items.length > 0 ? (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {items.map((item, index) => (
                  <div key={item.id} style={{ width: '100%' }}>
                    <DesignerItemCard
                      item={item}
                      selected={item.id === selectedId}
                      position={index}
                      count={items.length}
                      onSelect={() => onSelect(item.id)}
                      onMove={(offset) => onMove(item.id, offset)}
                    />
                  </div>
                ))}
              </Space>
            ) : (
              <div style={{ display: 'grid', minHeight: 280, placeItems: 'center' }}>
                <Empty
                  image={<InboxOutlined style={{ color: token.colorTextQuaternary, fontSize: 40 }} />}
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text strong>画布暂为空</Typography.Text>
                      <Typography.Text type="secondary">点击左侧控件添加，或拖动到这里</Typography.Text>
                    </Space>
                  }
                />
              </div>
            )}
          </SortableContext>
        </div>
      </div>
    </main>
  );
}
