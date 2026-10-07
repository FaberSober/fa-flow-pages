import { flowFormApi } from '@/services';
import { ApartmentOutlined, CalculatorOutlined, DatabaseOutlined, FormOutlined, OrderedListOutlined } from '@ant-design/icons';
import { Fa, FaFlexRestLayout, FaFullContentModal, FaHref, FaUtils } from '@fa/ui';
import { FaFormEditor } from '@features/fa-flow-pages/components';
import { Button, Modal, Segmented, Space, Spin, message } from 'antd';
import { cloneDeep, isEqual } from 'lodash';
import { useRef, useState } from 'react';
import type { Flow } from '@/types';
import FormTableEdit from '../cube/database/FormTableEdit';
import TableShowDesign from '../cube/table/TableShowDesign';
import FlowFormProcessManage from './FlowFormProcessManage';
import { useFlowFormEditStore } from '../store/useFlowFormEditStore';


export interface FlowFormConfigDrawerProps {
  itemId: number;
  refresh?: () => void;
}

/**
 * @author xu.pengfei
 * @date 2025-12-16 16:49:56
 */
export default function FlowFormConfigDrawer({ itemId, refresh }: FlowFormConfigDrawerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('database');
  const { flowForm, setFlowForm, clear } = useFlowFormEditStore()

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const savingRef = useRef(false);
  const savedConfig = useRef<Flow.FlowFormConfig>();
  const savedTableConfig = useRef<Flow.FlowFormTableConfig>();

  function handleConfigChange(config: Flow.FlowFormConfig) {
    const latest = useFlowFormEditStore.getState().flowForm;
    if (latest && !isEqual(latest.config, config)) setFlowForm({ ...latest, config });
  }

  async function handleOpen() {
    const request = ++requestId.current;
    clear();
    setOpen(true);
    setTab('database');
    setLoading(true);
    try {
      const res = await flowFormApi.getById(itemId);
      if (request !== requestId.current) return;
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '加载表单失败'); return; }
      savedConfig.current = cloneDeep(res.data.config);
      savedTableConfig.current = cloneDeep(res.data.tableConfig);
      setFlowForm(res.data);
    } catch {
      if (request === requestId.current) message.error('加载表单失败，请重试');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }

  function closeModal() {
    ++requestId.current;
    setOpen(false);
    clear();
    refresh?.();
  }

  function handleClose() {
    if (savingRef.current) return;
    const latest = useFlowFormEditStore.getState().flowForm;
    if (latest && (!isEqual(latest.config, savedConfig.current) || !isEqual(latest.tableConfig, savedTableConfig.current))) {
      Modal.confirm({ title: '表单或列表配置有未保存的修改', content: '关闭会放弃本次表单和列表设计修改。已执行的数据库结构修改和同步不受影响。', okText: '放弃并关闭', cancelText: '继续编辑', onOk: closeModal });
      return;
    }
    closeModal();
  }

  async function handleSave() {
    const latest = useFlowFormEditStore.getState().flowForm;
    if (!latest || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await flowFormApi.update(latest.id, { config: latest.config, tableConfig: latest.tableConfig });
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '保存配置失败'); return; }
      savedConfig.current = cloneDeep(latest.config);
      savedTableConfig.current = cloneDeep(latest.tableConfig);
      FaUtils.showResponse(res, '保存配置');
      if (tab !== 'process') closeModal();
    } catch {
      message.error('保存配置失败，请重试');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <FaFullContentModal
      displayMode="fullscreen"
      title="配置表单"
      triggerDom={<FaHref text="配置" icon={<CalculatorOutlined />} />}
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) handleOpen();
        else handleClose();
      }}
      showOk={false}
      showCancel={false}
      headerCenter={
        <Segmented
          options={[
            { value: 'database', label: <span><DatabaseOutlined style={{ marginRight: 4 }} />数据库表</span> },
            { value: 'form', label: <span><FormOutlined style={{ marginRight: 4 }} />表单设计</span> },
            { value: 'table', label: <span><OrderedListOutlined style={{ marginRight: 4 }} />列表设计</span> },
            { value: 'process', label: <span><ApartmentOutlined style={{ marginRight: 4 }} />流程配置</span> },
          ]}
          disabled={loading || saving || !flowForm}
          value={tab}
          onChange={setTab}
        />
      }
      headerExtra={
        <Space>
          <Button
            onClick={() => {
              const steps = ['database', 'form', 'table', 'process'];
              const currentIndex = steps.indexOf(tab);
              if (currentIndex > 0) setTab(steps[currentIndex - 1]);
            }}
            disabled={loading || saving || !flowForm || tab === 'database'}
          >
            上一步
          </Button>
          <Button
            onClick={() => {
              const steps = ['database', 'form', 'table', 'process'];
              const currentIndex = steps.indexOf(tab);
              if (currentIndex < steps.length - 1) setTab(steps[currentIndex + 1]);
            }}
            disabled={loading || saving || !flowForm || tab === 'process'}
          >
            下一步
          </Button>
          <Button type="primary" loading={saving} onClick={handleSave} disabled={loading || !flowForm}>保存表单配置</Button>
        </Space>
      }
    >
      {loading && <Spin />}
      {open && flowForm && (
        <div className="fa-full fa-flex-column fa-tabs" style={{ pointerEvents: saving ? 'none' : undefined, opacity: saving ? 0.6 : 1 }}>
          <FaFlexRestLayout style={{ overflow: 'hidden' }}>
            {tab === 'database' && <FormTableEdit />}
            {tab === 'form' && (
              <FaFormEditor
                flowForm={flowForm}
                config={flowForm.config}
                onChange={handleConfigChange}
              />
            )}
            {tab === 'table' && <TableShowDesign />}
            {tab === 'process' && <FlowFormProcessManage flowForm={flowForm} />}
          </FaFlexRestLayout>
        </div>
      )}
    </FaFullContentModal>
  );
}
