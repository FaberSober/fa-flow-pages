import { ArrowLeftOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FaUtils } from '@fa/ui';
import { FlowCatagoryCascader } from '@features/fa-flow-pages/components';
import { Alert, Button, Form, Input, Modal, message, Space, Spin, Splitter, Tag, Tooltip, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { flowFormApi } from '@/services';
import type { Flow } from '@/types';
import DesignerCanvas, { DESIGNER_CANVAS_DROP_ID } from './components/DesignerCanvas';
import DesignerControlPalette from './components/DesignerControlPalette';
import DesignerPreviewModal from './components/DesignerPreviewModal';
import DesignerPropertyPanel from './components/DesignerPropertyPanel';
import { createDesignerItem, DESIGNER_CONTROLS, type DesignerControlType, type DesignerItem, isDesignerControlType } from './model';

type DesignerDraftConfig = { version: 1; items: DesignerItem[] };

function readDesignerDraft(config: Flow.FlowForm['config']): DesignerDraftConfig | undefined {
  const designer = (config as unknown as { designer?: DesignerDraftConfig } | undefined)?.designer;
  return designer?.version === 1 && Array.isArray(designer.items) ? designer : undefined;
}

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
  const [searchParams] = useSearchParams();
  const requestedId = Number(searchParams.get('id'));
  const draftId = Number.isInteger(requestedId) && requestedId > 0 ? requestedId : undefined;
  const { token } = theme.useToken();
  const [items, setItems] = useState<DesignerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [draggingControl, setDraggingControl] = useState<DesignerControlType>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftRecord, setDraftRecord] = useState<Flow.FlowForm>();
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftId));
  const [draftLoadFailed, setDraftLoadFailed] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [metadataForm] = Form.useForm<{ name: string; catagoryId: number }>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedItem = items.find((item) => item.id === selectedId);

  useEffect(() => {
    if (!draftId) return;
    let active = true;
    setLoadingDraft(true);
    setDraftLoadFailed(false);
    flowFormApi
      .getById(draftId)
      .then((res) => {
        if (!active) return;
        if (!res.data) {
          setDraftLoadFailed(true);
          return;
        }
        setDraftRecord(res.data);
        setItems(readDesignerDraft(res.data.config)?.items ?? []);
        setSelectedId(undefined);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDraftLoadFailed(true);
        message.error(error instanceof Error ? error.message : '读取草稿失败');
      })
      .finally(() => {
        if (active) setLoadingDraft(false);
      });
    return () => {
      active = false;
    };
  }, [draftId]);

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

  const getDraftConfig = () => ({
    ...((draftRecord?.config as unknown as Record<string, unknown> | undefined) ?? {}),
    designer: { version: 1, items } satisfies DesignerDraftConfig,
  });

  const saveDraft = async (metadata?: { name: string; catagoryId: number }) => {
    setSavingDraft(true);
    try {
      const config = getDraftConfig();
      if (draftRecord) {
        const res = await flowFormApi.update(draftRecord.id, { config });
        FaUtils.showResponse(res, '保存草稿');
        setDraftRecord({ ...draftRecord, config: config as unknown as Flow.FlowForm['config'] });
        return;
      }

      if (!metadata) return;
      const res = await flowFormApi.save({
        ...metadata,
        no: `designer_${crypto.randomUUID().replaceAll('-', '')}`,
        type: 1,
        status: 2,
        sort: 0,
        config,
      });
      FaUtils.showResponse(res, '保存草稿');
      if (!res.data?.id) return;
      setSaveModalOpen(false);
      navigate(`/admin/flow/manage/form/designer?id=${res.data.id}`, { replace: true });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存草稿失败');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCreateDraft = (metadata: { name: string; catagoryId: number }) => {
    void saveDraft(metadata);
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
              {draftRecord?.name ?? '新建流程表单'}
            </Typography.Title>
            <Tag color="blue">交互预览</Tag>
          </Space>
          <Typography.Text type="secondary">添加控件并在属性面板中配置表单{draftRecord ? ' · 草稿' : ''}</Typography.Text>
        </div>
        <div style={{ flex: 1 }} />
        <Tooltip title="切换查看填报表单和默认列表配置">
          <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
            预览
          </Button>
        </Tooltip>
        <Tooltip title="保存设计配置，不会创建或修改数据库表">
          <Button
            type="primary"
            loading={savingDraft}
            disabled={loadingDraft || draftLoadFailed}
            icon={<SaveOutlined />}
            onClick={() => {
              if (draftRecord) {
                void saveDraft();
              } else {
                metadataForm.resetFields();
                setSaveModalOpen(true);
              }
            }}
          >
            保存草稿
          </Button>
        </Tooltip>
      </header>

      <Alert
        banner
        showIcon
        type="info"
        message={
          draftRecord ? '正在编辑草稿；修改后请保存，数据库表结构将在后续发布步骤中处理。' : '添加控件并预览后保存草稿；首次保存只需填写表单名称和所属分类。'
        }
      />

      {loadingDraft ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <Spin description="正在读取草稿" />
        </div>
      ) : draftLoadFailed ? (
        <div style={{ flex: 1, padding: 24 }}>
          <Alert showIcon type="error" message="草稿读取失败" description="请返回表单列表后重新打开草稿。" />
        </div>
      ) : (
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
      )}
      <DesignerPreviewModal open={previewOpen} items={items} onClose={() => setPreviewOpen(false)} />
      <Modal
        title="保存流程表单草稿"
        open={saveModalOpen}
        confirmLoading={savingDraft}
        onOk={() => metadataForm.submit()}
        onCancel={() => setSaveModalOpen(false)}
      >
        <Typography.Paragraph type="secondary">填写名称和所属分类即可。表单编码由系统生成；保存草稿不会创建或修改数据库表。</Typography.Paragraph>
        <Form form={metadataForm} layout="vertical" onFinish={handleCreateDraft}>
          <Form.Item name="name" label="表单名称" rules={[{ required: true, whitespace: true, message: '请输入表单名称' }]}>
            <Input maxLength={255} placeholder="例如：客户反馈登记" />
          </Form.Item>
          <Form.Item name="catagoryId" label="所属分类" rules={[{ required: true, message: '请选择流程分类' }]}>
            <FlowCatagoryCascader placeholder="请选择流程分类" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
