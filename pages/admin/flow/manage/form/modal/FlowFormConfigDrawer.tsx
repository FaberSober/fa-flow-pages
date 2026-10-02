import { flowFormApi } from '@/services';
import { CalculatorOutlined, DatabaseOutlined, FormOutlined, OrderedListOutlined } from '@ant-design/icons';
import { Fa, FaFlexRestLayout, FaHref, FaUtils } from '@fa/ui';
import { FaFormEditor } from '@features/fa-flow-pages/components';
import { Button, Drawer, Modal, Segmented, Space, Spin, message } from 'antd';
import { isEqual } from 'lodash';
import { useRef, useState } from 'react';
import type { Flow } from '@/types';
import FormTableEdit from '../cube/database/FormTableEdit';
import TableShowDesign from '../cube/table/TableShowDesign';
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
      savedConfig.current = res.data.config;
      setFlowForm(res.data);
    } catch {
      if (request === requestId.current) message.error('加载表单失败，请重试');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }

  function closeDrawer() {
    ++requestId.current;
    setOpen(false);
    clear();
    refresh?.();
  }

  function handleClose() {
    if (savingRef.current) return;
    const latest = useFlowFormEditStore.getState().flowForm;
    if (latest && !isEqual(latest.config, savedConfig.current)) {
      Modal.confirm({ title: '表单设计有未保存的修改', content: '关闭会放弃本次表单设计修改。数据库结构和已同步的配置已单独保存。', okText: '放弃并关闭', cancelText: '继续编辑', onOk: closeDrawer });
      return;
    }
    closeDrawer();
  }

  async function handleSave() {
    const latest = useFlowFormEditStore.getState().flowForm;
    if (!latest || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await flowFormApi.update(latest.id, { config: latest.config });
      if (res.status !== Fa.RES_CODE.OK) { message.error(res.message || '保存配置失败'); return; }
      savedConfig.current = latest.config;
      FaUtils.showResponse(res, '保存配置');
      closeDrawer();
    } catch {
      message.error('保存配置失败，请重试');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <span>
      <FaHref onClick={() => handleOpen()} text='配置' icon={<CalculatorOutlined />} />
      <Drawer
        title="配置表单"
        open={open}
        onClose={handleClose}
        size={window.document.body.clientWidth}
        resizable
        extra={(
          <Space>
            <Button 
              onClick={() => {
                const steps = ['database', 'form', 'table'];
                const currentIndex = steps.indexOf(tab);
                if (currentIndex > 0) {
                  setTab(steps[currentIndex - 1]);
                }
              }}
              disabled={loading || saving || tab === 'database'}
            >
              上一步
            </Button>
            <Button 
              onClick={() => {
                const steps = ['database', 'form', 'table'];
                const currentIndex = steps.indexOf(tab);
                if (currentIndex < steps.length - 1) {
                  setTab(steps[currentIndex + 1]);
                }
              }}
              disabled={loading || saving || tab === 'table'}
            >
              下一步
            </Button>
            <Button type="primary" loading={saving} onClick={() => handleSave()} disabled={loading || !flowForm}>保存配置</Button>
          </Space>
        )}
        styles={{
          body: {
            background: 'var(--fa-bg-grey3)',
          }
        }}
        push={false}
      >
        {loading && <Spin />}
        {(open) && flowForm && (
          <>
            <div className="fa-full" style={{ pointerEvents: saving ? 'none' : undefined, opacity: saving ? 0.6 : 1 }}>
              <div className="fa-full-content fa-p12 fa-bg-grey fa-flex-column fa-tabs">
                <div style={{position: 'fixed', top: 7, left: 'calc(50vw - 146px)' }}>
                  <Segmented
                    options={[
                      { value: 'database', label: <span><DatabaseOutlined style={{marginRight: 4}} />数据库表</span> },
                      { value: 'form', label: <span><FormOutlined style={{marginRight: 4}} />表单设计</span> },
                      { value: 'table', label: <span><OrderedListOutlined style={{marginRight: 4}} />列表设计</span> },
                    ]}
                    disabled={saving}
                    value={tab}
                    onChange={setTab}
                  />
                </div>

                <FaFlexRestLayout style={{ overflow: 'hidden' }}>
                  {tab === 'database' && (
                    <FormTableEdit />
                  )}
                  {tab === 'form' && (
                    <FaFormEditor
                      flowForm={flowForm}
                      config={flowForm?.config}
                      onChange={handleConfigChange}
                    />
                  )}
                  {tab === 'table' && (
                    <TableShowDesign />
                  )}
                </FaFlexRestLayout>
              </div>
            </div>
          </>
        )}
      </Drawer>
    </span>
  );
}
