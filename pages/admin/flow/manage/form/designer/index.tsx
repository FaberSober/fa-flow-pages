import { ArrowLeftOutlined, CheckCircleOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Fa, FaUtils } from '@fa/ui';
import { FlowCatagoryCascader } from '@features/fa-flow-pages/components';
import { Alert, Button, Form, Input, Modal, message, Space, Spin, Splitter, Tag, Tooltip, Typography, theme } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { flowFormApi } from '@/services';
import type { Flow } from '@/types';
import DesignerCanvas, { DESIGNER_CANVAS_DROP_ID } from './components/DesignerCanvas';
import DesignerControlPalette from './components/DesignerControlPalette';
import DesignerPreviewModal from './components/DesignerPreviewModal';
import DesignerPropertyPanel from './components/DesignerPropertyPanel';
import DesignerPublishCheckModal from './components/DesignerPublishCheckModal';
import { createDesignerItem, DESIGNER_CONTROLS, type DesignerControlType, type DesignerItem, isDesignerControlType } from './model';

type DesignerDraftConfig = { version: 1; items: DesignerItem[] };
type DraftMetadata = { name: string; catagoryId: number };

function draftSnapshot(metadata: Partial<DraftMetadata>, items: DesignerItem[]) {
  return JSON.stringify({ name: metadata.name ?? '', catagoryId: metadata.catagoryId, items });
}

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
  const [publishCheckOpen, setPublishCheckOpen] = useState(false);
  const [draftRecord, setDraftRecord] = useState<Flow.FlowForm>();
  const [loadingDraft, setLoadingDraft] = useState(Boolean(draftId));
  const [draftLoadFailed, setDraftLoadFailed] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const savingRef = useRef(false);
  const [metadataForm] = Form.useForm<DraftMetadata>();
  const name = Form.useWatch('name', metadataForm);
  const catagoryId = Form.useWatch('catagoryId', metadataForm);
  const [savedSnapshot, setSavedSnapshot] = useState(() => draftSnapshot({}, []));
  const hasChanges = !loadingDraft && !draftLoadFailed && savedSnapshot !== draftSnapshot({ name, catagoryId }, items);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedItem = items.find((item) => item.id === selectedId);

  useEffect(() => {
    if (!draftId) {
      setDraftRecord(undefined);
      setItems([]);
      setSelectedId(undefined);
      metadataForm.resetFields();
      setSavedSnapshot(draftSnapshot({}, []));
      setLoadingDraft(false);
      setDraftLoadFailed(false);
      return;
    }
    let active = true;
    setLoadingDraft(true);
    setDraftLoadFailed(false);
    flowFormApi
      .getById(draftId)
      .then((res) => {
        if (!active) return;
        if (res.status !== Fa.RES_CODE.OK || !res.data) {
          throw new Error(res.message || '读取草稿失败');
        }
        const draftItems = readDesignerDraft(res.data.config)?.items ?? [];
        const metadata = { name: res.data.name, catagoryId: res.data.catagoryId };
        setDraftRecord(res.data);
        setItems(draftItems);
        metadataForm.setFieldsValue(metadata);
        setSavedSnapshot(draftSnapshot(metadata, draftItems));
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
  }, [draftId, metadataForm]);

  useEffect(() => {
    if (!hasChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleBack = () => {
    if (savingRef.current) return;
    const goBack = () => navigate('/admin/flow/manage/form');
    if (!hasChanges) {
      goBack();
      return;
    }
    Modal.confirm({
      title: '还有未保存的修改',
      content: '返回列表会丢弃本次修改。你可以留在这里保存草稿。',
      okText: '放弃修改并返回',
      cancelText: '继续编辑',
      onOk: goBack,
    });
  };

  const addItem = (control: Parameters<typeof createDesignerItem>[0]) => {
    if (savingRef.current) return;
    const item = createDesignerItem(control, items);
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
  };

  const moveItem = (id: string, offset: -1 | 1) => {
    if (savingRef.current) return;
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
    if (savingRef.current || !over) return;
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
    if (savingRef.current || !selectedItem) return;
    setItems((current) => current.map((item) => (item.id === selectedItem.id ? ({ ...item, ...patch } as DesignerItem) : item)));
  };

  const deleteSelectedItem = () => {
    if (savingRef.current || !selectedItem) return;
    setItems((current) => current.filter((item) => item.id !== selectedItem.id));
    setSelectedId(undefined);
  };

  const getDraftConfig = () => ({
    ...((draftRecord?.config as unknown as Record<string, unknown> | undefined) ?? {}),
    designer: { version: 1, items } satisfies DesignerDraftConfig,
  });

  const saveDraft = async (values: DraftMetadata) => {
    if (savingRef.current || loadingDraft || draftLoadFailed) return;
    savingRef.current = true;
    setSavingDraft(true);
    try {
      const metadata = { ...values, name: values.name.trim() };
      const config = getDraftConfig();
      if (draftRecord) {
        const res = await flowFormApi.update(draftRecord.id, { ...metadata, config });
        if (res.status !== Fa.RES_CODE.OK) throw new Error(res.message || '保存草稿失败');
        setDraftRecord({ ...draftRecord, ...metadata, config: config as unknown as Flow.FlowForm['config'] });
        metadataForm.setFieldsValue(metadata);
        setSavedSnapshot(draftSnapshot(metadata, items));
        FaUtils.showResponse(res, '保存草稿');
        return;
      }

      const res = await flowFormApi.save({
        ...metadata,
        no: `designer_${crypto.randomUUID().replaceAll('-', '')}`,
        type: 1,
        status: 2,
        sort: 0,
        config,
      });
      if (res.status !== Fa.RES_CODE.OK || !res.data?.id) throw new Error(res.message || '保存草稿失败');
      setSavedSnapshot(draftSnapshot(metadata, items));
      FaUtils.showResponse(res, '保存草稿');
      navigate(`/admin/flow/manage/form/designer?id=${res.data.id}`, { replace: true });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存草稿失败');
    } finally {
      savingRef.current = false;
      setSavingDraft(false);
    }
  };

  return (
    <div className="fa-full fa-flex-column fa-bg-white" style={{ position: 'relative' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          padding: '12px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} aria-label="返回流程表单列表" disabled={savingDraft} onClick={handleBack} />
        <div style={{ minWidth: 0 }}>
          <Space size={8} wrap>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {name?.trim() || '新建表单'}
            </Typography.Title>
            <Tag color={hasChanges ? 'orange' : draftRecord ? 'green' : 'default'}>
              {hasChanges ? '有未保存的修改' : draftRecord ? '草稿已保存' : '未保存草稿'}
            </Tag>
          </Space>
          <Typography.Text type="secondary">添加字段、设置属性，保存后可随时继续编辑</Typography.Text>
        </div>
        <div style={{ flex: 1 }} />
        <Tooltip title="切换查看填报表单和默认列表配置">
          <Button disabled={loadingDraft || draftLoadFailed} icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
            预览
          </Button>
        </Tooltip>
        <Tooltip title="检查字段设置并查看摘要，不会创建数据库表">
          <Button disabled={loadingDraft || draftLoadFailed} icon={<CheckCircleOutlined />} onClick={() => setPublishCheckOpen(true)}>
            发布前检查
          </Button>
        </Tooltip>
        <Tooltip title="保存设计配置，不会创建或修改数据库表">
          <Button
            type="primary"
            loading={savingDraft}
            disabled={loadingDraft || draftLoadFailed}
            icon={<SaveOutlined />}
            onClick={() => metadataForm.submit()}
          >
            保存草稿
          </Button>
        </Tooltip>
      </header>

      <Form
        form={metadataForm}
        layout="inline"
        disabled={loadingDraft || draftLoadFailed || savingDraft}
        onFinish={saveDraft}
        style={{ padding: '12px 16px', gap: 12, borderBottom: `1px solid ${token.colorBorderSecondary}`, flexWrap: 'wrap' }}
      >
        <Form.Item name="name" label="表单名称" rules={[{ required: true, whitespace: true, message: '请输入表单名称' }]}>
          <Input maxLength={255} placeholder="例如：客户反馈登记" style={{ width: 260 }} />
        </Form.Item>
        <Form.Item name="catagoryId" label="所属分类" rules={[{ required: true, message: '请选择所属分类' }]}>
          <FlowCatagoryCascader placeholder="请选择所属分类" style={{ width: 220 }} />
        </Form.Item>
      </Form>
      <Alert banner showIcon type="info" message="填写名称和分类，添加字段后保存草稿。草稿可重新打开继续编辑，暂未开放实际发布与填报。" />

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
      <DesignerPublishCheckModal open={publishCheckOpen} items={items} onClose={() => setPublishCheckOpen(false)} />
      {savingDraft && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', background: token.colorBgMask }}>
          <Spin description="正在保存草稿" />
        </div>
      )}
    </div>
  );
}
