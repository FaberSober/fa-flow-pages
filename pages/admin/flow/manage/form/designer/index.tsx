import { ArrowLeftOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Alert, Button, Space, Splitter, Tag, Tooltip, Typography, theme } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DesignerCanvas, { DESIGNER_CANVAS_DROP_ID } from './components/DesignerCanvas';
import DesignerControlPalette from './components/DesignerControlPalette';
import DesignerPropertyPanel from './components/DesignerPropertyPanel';
import { createDesignerItem, DESIGNER_CONTROLS, type DesignerControlType, type DesignerItem, isDesignerControlType } from './model';

const canvasCollisionDetection: CollisionDetection = (args) => {
  const canvasTargets = args.droppableContainers.filter((container) => container.id === DESIGNER_CANVAS_DROP_ID || container.data.current?.source === 'canvas');
  const collisions = pointerWithin({ ...args, droppableContainers: canvasTargets });
  const canvasCollision = collisions.find((collision) => collision.id === DESIGNER_CANVAS_DROP_ID);
  if (!canvasCollision) return [];

  const activeSource = args.active.data.current?.source;
  const targetCollision =
    activeSource === 'canvas'
      ? (collisions.find((collision) => collision.id !== DESIGNER_CANVAS_DROP_ID && collision.id !== args.active.id) ??
        collisions.find((collision) => collision.id === args.active.id))
      : collisions.find((collision) => collision.id !== DESIGNER_CANVAS_DROP_ID);

  return [targetCollision ?? canvasCollision];
};

export default function FlowFormDesignerPage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [items, setItems] = useState<DesignerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [draggingControl, setDraggingControl] = useState<DesignerControlType>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedItem = items.find((item) => item.id === selectedId);

  const addItem = (control: Parameters<typeof createDesignerItem>[0]) => {
    const item = createDesignerItem(control, items);
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
  };

  const moveItem = (id: string, offset: -1 | 1) => {
    const from = items.findIndex((item) => item.id === id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= items.length) return;
    setItems((current) => arrayMove(current, from, to));
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const dragData = active.data.current as { source?: string; control?: unknown } | undefined;
    setDraggingControl(dragData?.source === 'palette' && isDesignerControlType(dragData.control) ? dragData.control : undefined);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingControl(undefined);
    if (!over) return;
    const dragData = active.data.current as { source?: string; control?: unknown } | undefined;

    if (dragData?.source === 'palette' && isDesignerControlType(dragData.control)) {
      if (over.id !== DESIGNER_CANVAS_DROP_ID && !items.some((item) => item.id === String(over.id))) return;
      const item = createDesignerItem(dragData.control, items);
      const targetIndex = over.id === DESIGNER_CANVAS_DROP_ID ? items.length : items.findIndex((current) => current.id === String(over.id));
      const nextItems = [...items];
      nextItems.splice(targetIndex < 0 ? nextItems.length : targetIndex, 0, item);
      setItems(nextItems);
      setSelectedId(item.id);
      return;
    }

    if (dragData?.source !== 'canvas') return;
    const from = items.findIndex((item) => item.id === String(active.id));
    const targetIndex = over.id === DESIGNER_CANVAS_DROP_ID ? items.length - 1 : items.findIndex((item) => item.id === String(over.id));
    if (from >= 0 && targetIndex >= 0 && from !== targetIndex) {
      setItems((current) => arrayMove(current, from, targetIndex));
    }
  };

  const updateSelectedItem = (patch: Partial<DesignerItem>) => {
    if (!selectedItem) return;
    setItems((current) => current.map((item) => (item.id === selectedItem.id ? ({ ...item, ...patch } as DesignerItem) : item)));
  };

  const deleteSelectedItem = () => {
    if (!selectedItem) return;
    setItems((current) => current.filter((item) => item.id !== selectedItem.id));
    setSelectedId(undefined);
  };

  return (
    <div className="fa-full fa-flex-column fa-bg-white">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} aria-label="返回流程表单列表" onClick={() => navigate('/admin/flow/manage/form')} />
        <div style={{ minWidth: 0 }}>
          <Space size={8} wrap>
            <Typography.Title level={5} style={{ margin: 0 }}>
              新建流程表单
            </Typography.Title>
            <Tag color="blue">交互预览</Tag>
          </Space>
          <Typography.Text type="secondary">添加控件并在属性面板中配置表单</Typography.Text>
        </div>
        <div style={{ flex: 1 }} />
        <Tooltip title="表单预览将在后续阶段开放">
          <span>
            <Button disabled icon={<EyeOutlined />}>
              预览
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="草稿保存将在后续阶段开放">
          <span>
            <Button type="primary" disabled icon={<SaveOutlined />}>
              保存草稿
            </Button>
          </span>
        </Tooltip>
      </header>

      <Alert banner showIcon type="info" message="当前设计仅保存在页面状态中，刷新后会清空；草稿保存将在后续阶段接入。" />

      <DndContext
        sensors={sensors}
        collisionDetection={canvasCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingControl(undefined)}
      >
        <Splitter style={{ flex: 1, minHeight: 0 }}>
          <Splitter.Panel defaultSize={248} min={216} max="32%" collapsible>
            <div style={{ height: '100%', overflow: 'auto', background: token.colorBgContainer }}>
              <DesignerControlPalette onAdd={addItem} />
            </div>
          </Splitter.Panel>

          <Splitter.Panel>
            <DesignerCanvas items={items} selectedId={selectedId} onSelect={setSelectedId} onMove={moveItem} />
          </Splitter.Panel>

          <Splitter.Panel defaultSize={304} min={264} max="40%" collapsible>
            <div style={{ height: '100%', overflow: 'auto', background: token.colorBgContainer }}>
              <DesignerPropertyPanel item={selectedItem} onChange={updateSelectedItem} onDelete={deleteSelectedItem} />
            </div>
          </Splitter.Panel>
        </Splitter>
        <DragOverlay dropAnimation={null}>{draggingControl ? <Tag color="blue">添加{DESIGNER_CONTROLS[draggingControl].label}</Tag> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
