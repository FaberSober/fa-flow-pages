import { ReloadOutlined } from '@ant-design/icons';
import { Fa, useApiLoading } from '@fa/ui';
import { Alert, Button, Empty, List, Space, Spin, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { flowProcessApi } from '@/services';
import { Flow, FlowEnums } from '@/types';
import FlowProcessEdit from '../../deploy/cube/FlowProcessEdit';
import FlowProcessModal from '../../deploy/modal/FlowProcessModal';

interface FlowFormProcessManageProps {
  flowForm: Flow.FlowForm;
}

function getProcessState(processState: number) {
  if (processState === 1) return { text: '已启用', color: 'green' };
  if (processState === 2) return { text: '历史版本', color: 'blue' };
  return { text: '未启用', color: 'default' };
}

export default function FlowFormProcessManage({ flowForm }: FlowFormProcessManageProps) {
  const [processes, setProcesses] = useState<Flow.FlowProcess[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [loadError, setLoadError] = useState(false);
  const loading = useApiLoading([flowProcessApi.getUrl('list')]);

  const createDefaults = useMemo<Partial<Flow.FlowProcess>>(
    () => ({
      catagoryId: flowForm.catagoryId,
      formType: FlowEnums.FlowProcessFormType.CUSTOM,
      formId: flowForm.id,
      useScope: 0,
      processState: 0,
      sort: 0,
    }),
    [flowForm.catagoryId, flowForm.id],
  );

  const loadProcesses = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await flowProcessApi.list({ query: { formId: flowForm.id }, sorter: 'sort asc,id asc' });
      if (res.status !== Fa.RES_CODE.OK) {
        setLoadError(true);
        return [];
      }
      const next = (res.data || []).filter((item) => item.formType === FlowEnums.FlowProcessFormType.CUSTOM && Number(item.formId) === Number(flowForm.id));
      setProcesses(next);
      setSelectedId((current) => (next.some((item) => item.id === current) ? current : next[0]?.id));
      return next;
    } catch {
      setLoadError(true);
      return [];
    }
  }, [flowForm.id]);

  useEffect(() => {
    void loadProcesses();
  }, [loadProcesses]);

  const selected = processes.find((item) => item.id === selectedId);
  const hasConflict = processes.length > 1;

  return (
    <div className="fa-full-content fa-flex-column" style={{ minHeight: 0, padding: 16 }}>
      <Alert className="fa-mb12" type="info" showIcon message="流程节点读取已保存的表单字段配置；若刚修改表单设计，请先点击右上角“保存表单配置”。" />
      <div className="fa-flex-row" style={{ gap: 16, minHeight: 0, flex: 1 }}>
        <div className="fa-flex-column" style={{ flex: '0 0 320px', minWidth: 240, overflowY: 'auto' }}>
          <Space className="fa-mb12" style={{ justifyContent: 'space-between' }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {hasConflict ? `旧关联冲突（${processes.length}）` : '关联流程'}
            </Typography.Title>
            {!loading && !loadError && processes.length === 0 && <FlowProcessModal
              addBtn
              title="新增关联流程"
              defaultValues={createDefaults}
              fixedFormId={flowForm.id}
              onCreated={async (created) => {
                const next = await loadProcesses();
                const createdProcess = next.find((item) => {
                  if (created?.processKey) return item.processKey === created.processKey;
                  return created?.id != null && Number(item.id) === Number(created.id);
                });
                if (createdProcess) setSelectedId(createdProcess.id);
              }}
            />}
          </Space>

          {loadError && (
            <Alert
              className="fa-mb12"
              type="error"
              showIcon
              message="关联流程加载失败"
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadProcesses()}>
                  重试
                </Button>
              }
            />
          )}

          <Spin spinning={loading}>
            {processes.length === 0 && !loadError ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前表单还没有关联流程" />
            ) : (
              <List
                dataSource={processes}
                split={false}
                renderItem={(item) => {
                  const active = !hasConflict && item.id === selectedId;
                  const state = getProcessState(item.processState);
                  return (
                    <List.Item key={item.id} style={{ padding: 0, border: 0, marginBottom: 8 }}>
                      <div
                        style={{ width: '100%', padding: 12, borderRadius: 6, border: `1px solid ${active ? 'var(--ant-color-primary)' : 'var(--ant-color-border)'}`, background: active ? 'var(--ant-color-primary-bg)' : 'var(--ant-color-bg-container)' }}
                      >
                        <div style={{ width: '100%' }}>
                          <Space direction="vertical" size={4} style={{ width: '100%', alignItems: 'stretch' }}>
                            <Space style={{ justifyContent: 'space-between' }}>
                              <Typography.Text strong>{item.processName || '未命名流程'}</Typography.Text>
                              <Tag color={state.color}>{state.text}</Tag>
                            </Space>
                            <Typography.Text type={active ? undefined : 'secondary'}>{item.processKey}</Typography.Text>
                            {hasConflict && (
                              <FlowProcessModal record={item} title="重新关联表单" fetchFinish={() => void loadProcesses()}>
                                <Button type="link" style={{ padding: 0 }}>重新关联表单</Button>
                              </FlowProcessModal>
                            )}
                          </Space>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Spin>
        </div>

        <div className="fa-flex-1 fa-flex-column" style={{ minWidth: 0, borderLeft: '1px solid var(--ant-color-border)', paddingLeft: 16 }}>
          {hasConflict ? (
            <Alert
              type="warning"
              showIcon
              message="该表单关联了多个流程，请先处理旧配置"
              description="一张表单最多关联一个流程。请明确需要保留的流程，为其他用途创建独立申请表单，再逐一点击左侧“重新关联表单”，修改自定义表单并保存。原业务数据与流程实例不会删除；处理完成后可继续设计及发布。"
            />
          ) : selected ? (
            <FlowProcessEdit key={selected.id} item={selected} fixedFormId={flowForm.id} embedded onSuccess={() => void loadProcesses()} />
          ) : (
            <div className="fa-full fa-flex-center">
              <Empty description={loadError ? '关联流程加载失败，请重试' : processes.length === 0 ? '先新增一个关联流程' : '请选择一个流程继续配置'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
