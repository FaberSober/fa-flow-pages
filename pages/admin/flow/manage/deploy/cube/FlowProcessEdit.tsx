import { Fa, FaFlexRestLayout, FaFullContentModal, FaUtils, useApiLoading } from '@fa/ui';
import { FaWorkFlow } from '@features/fa-flow-pages/components';
import { parseEditorModel, validateProcessModelContent, type ProcessModelIssue } from '@features/fa-flow-pages/components/flow/modelValidation';
import type { Flw } from '@features/fa-flow-pages/types';
import { WorkFlowProvider } from '@features/fa-flow-pages/components/flow/stores/useWorkFlowStore';
import { WorkFlowHistoryScope } from '@features/fa-flow-pages/components/flow/WorkFlowHistory';
import NodeConfigPanel from '@features/fa-flow-pages/components/flow/NodeConfigPanel';
import { flowProcessApi } from '@features/fa-flow-pages/services';
import { Alert, Button, Checkbox, Form, Modal, message, Splitter, Steps, Typography, Tag, Tooltip } from 'antd';
import { get } from 'lodash';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flow } from '@/types';
import FlowProcessForm from './FlowProcessForm';
import { flowSavePayload, flowSaveSnapshot } from './flowSaveSnapshot';
import { FlowPublishError, publishFlow } from './flowPublish';
import { protectFlowUnload } from './flowLeaveGuard';
import FlowValidationPanel from './FlowValidationPanel';
import './FlowProcessEdit.scss';

const { Text } = Typography;

interface FlowProcessEditProps {
  item: Flow.FlowProcess;
  onSuccess?: () => void;
  onClose?: () => void;
  triggerDom?: ReactNode;
  viewOnly?: boolean;
  embedded?: boolean;
  fixedFormId?: number;
}

export default function FlowProcessEdit({ item, onSuccess, onClose, triggerDom, viewOnly, embedded, fixedFormId }: FlowProcessEditProps) {
  const [data, setData] = useState({ ...item });
  const savedData = useRef(item);
  const savedDuringSession = useRef(false);
  const saveLock = useRef(false);
  const saveSession = useRef(0);
  const [savedSnapshot, setSavedSnapshot] = useState(() => flowSaveSnapshot(item));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'failed'>('idle');
  const [publishState, setPublishState] = useState<'idle' | 'saving' | 'deploying' | 'saveFailed' | 'deployFailed'>('idle');
  const publishLock = useRef(false);
  const leaveConfirmOpen = useRef(false);
  const [current, setCurrent] = useState(embedded ? 1 : 0);
  const [open, setOpen] = useState(false);
  const [designVisited, setDesignVisited] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const sessionItem = useRef(item);

  useEffect(() => {
    if (current === 1) setDesignVisited(true);
  }, [current, editorSession]);
  const [validationRequested, setValidationRequested] = useState(false);
  const [validationIssue, setValidationIssue] = useState<ProcessModelIssue>();
  const dataRef = useRef(data);
  dataRef.current = data;
  const editorModel = useMemo(() => parseEditorModel(data.modelContent), [data.modelContent]);
  const validation = useMemo(() => validationRequested ? validateProcessModelContent(data.modelContent, data.processKey) : undefined, [validationRequested, data.modelContent, data.processKey]);
  const [form] = Form.useForm();
  const [extendForm] = Form.useForm();
  const publishConfirmOpen = useRef(false);
  const loading = useApiLoading([flowProcessApi.getUrl('update'), flowProcessApi.getUrl('publish')]);

  const handleClose = useCallback(() => {
    saveSession.current += 1;
    setOpen(false);
    if (savedDuringSession.current) {
      savedDuringSession.current = false;
      onSuccess?.();
    }
    onClose?.();
  }, [onClose, onSuccess]);

  useEffect(() => {
    if (sessionItem.current !== item) {
      sessionItem.current = item;
      savedData.current = item;
      savedDuringSession.current = false;
      saveSession.current += 1;
      setSavedSnapshot(flowSaveSnapshot(item));
      setSaveState('idle');
      setPublishState('idle');
      setDesignVisited(false);
      setEditorSession(value => value + 1);
    }
    setData({ ...item });
    setValidationRequested(false);
    setValidationIssue(undefined);
    // 设置扩展配置表单数据
    extendForm.setFieldsValue({
      submitterPermission: get(item, 'submitterPermission', false),
    });
  }, [item, form, extendForm]);

  const formInitialValues = useMemo(() => {
    return {
      catagoryId: get(item, 'catagoryId'),
      processKey: get(item, 'processKey'),
      processName: get(item, 'processName'),
      processIcon: get(item, 'processIcon'),
      processType: get(item, 'processType'),
      instanceUrl: get(item, 'instanceUrl'),
      remark: get(item, 'remark'),
      useScope: get(item, 'useScope'),
      processState: get(item, 'processState'),
      formType: get(item, 'formType'),
      formId: get(item, 'formId'),
      sort: get(item, 'sort'),
    };
  }, [item]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setDesignVisited(false);
        setEditorSession(value => value + 1);
        setCurrent(0);
        saveSession.current += 1;
        setSaveState('idle');
        setPublishState('idle');
        setSavedSnapshot(flowSaveSnapshot(savedData.current));
        setData({ ...savedData.current });
        setValidationRequested(false);
        setValidationIssue(undefined);
        form.resetFields();
        form.setFieldsValue(savedData.current);
        extendForm.resetFields();
        extendForm.setFieldsValue({
          submitterPermission: get(savedData.current, 'submitterPermission', false),
        });
      }
      // FaFullContentModal first calls onOpenChange(false), then onCancel.
      // Keep controlled visibility until requestClose confirms discarding.
      if (nextOpen) setOpen(true);
    },
    [extendForm, form, formInitialValues, item],
  );

  const dirty = flowSaveSnapshot(data) !== savedSnapshot;
  useEffect(() => {
    if (viewOnly || (!embedded && !open)) return;
    return protectFlowUnload(window, () => saveLock.current || publishLock.current || flowSaveSnapshot(dataRef.current) !== flowSaveSnapshot(savedData.current));
  }, [embedded, open, viewOnly]);

  function requestClose() {
    if (saveLock.current || publishLock.current) {
      message.info('正在保存或发布，请稍候再关闭');
      return;
    }
    if (leaveConfirmOpen.current) return;
    if (viewOnly || flowSaveSnapshot(dataRef.current) === flowSaveSnapshot(savedData.current)) {
      handleClose();
      return;
    }
    leaveConfirmOpen.current = true;
    Modal.confirm({
      title: '流程有未保存的修改',
      content: '关闭会放弃未保存的修改，已保存的流程定义不受影响。',
      okText: '放弃并关闭',
      cancelText: '继续编辑',
      afterClose: () => { leaveConfirmOpen.current = false; },
      onOk: () => {
        if (saveLock.current || publishLock.current) throw new Error('请等待保存或发布完成');
        handleClose();
      },
    });
  }

  const saveStatus = saveState === 'saving' ? '保存中' : saveState === 'failed' ? '保存失败' : dirty ? '未保存' : '已保存';
  const saveStatusTag = <Tooltip title="保存定义不部署模型；基础信息和流程状态保存后立即生效"><Tag color={saveState === 'saving' ? 'processing' : saveState === 'failed' ? 'error' : dirty ? 'warning' : 'success'}>{saveStatus}</Tag></Tooltip>;
  const publishStatusTag = publishState !== 'idle' && (
    <Tag color={publishState === 'saveFailed' || publishState === 'deployFailed' ? 'error' : 'processing'}>
      {{ saving: '发布：保存中', deploying: '发布：部署中', saveFailed: '发布：保存失败', deployFailed: '已保存，发布失败' }[publishState]}
    </Tag>
  );

  async function handleSave() {
    if (saveLock.current || publishConfirmOpen.current || loading) return;
    saveLock.current = true;
    const session = saveSession.current;
    try {
      let values;
      try { values = await form.validateFields(); }
      catch { setCurrent(0); message.error('请先完善基础信息'); return; }
      if (session !== saveSession.current) return;
      const snapshot = { ...dataRef.current, ...values, ...extendForm.getFieldsValue() };
      const payload = flowSavePayload(snapshot) as unknown as Flow.FlowProcess;
      setData(snapshot);
      setSaveState('saving');
      const response = await flowProcessApi.update(snapshot.id, payload);
      if (response.status !== Fa.RES_CODE.OK) throw new Error('保存失败');
      if (session !== saveSession.current) return;
      savedData.current = snapshot;
      savedDuringSession.current = true;
      setSavedSnapshot(flowSaveSnapshot(snapshot));
      setSaveState('idle');
      setPublishState('idle');
      message.success('流程定义已保存，模型尚未发布');
    } catch {
      if (session === saveSession.current) {
        setSaveState('failed');
        message.error('保存失败，编辑内容已保留，请重试');
      }
    } finally {
      saveLock.current = false;
    }
  }

  async function handlePublish() {
    if (publishConfirmOpen.current || publishLock.current || saveLock.current || loading) return;
    publishConfirmOpen.current = true;
    try {
      // 校验基础信息表单
      const formValues = await form.validateFields();

      // 获取扩展配置表单数据
      const extendValues = extendForm.getFieldsValue();

      // 组合所有数据
      const publishData = {
        ...dataRef.current,
        ...formValues,
        ...extendValues,
      };

      const modelValidation = validateProcessModelContent(publishData.modelContent, publishData.processKey);
      setData(publishData);
      setValidationRequested(true);
      setValidationIssue(undefined);
      if (!modelValidation.valid) {
        publishConfirmOpen.current = false;
        setCurrent(1);
        message.error(`流程模型校验失败：${modelValidation.errors[0]}`);
        return;
      }

      const session = saveSession.current;
      const requestSnapshot = flowSaveSnapshot(publishData);
      const payload = flowSavePayload(publishData) as unknown as Flow.FlowProcess;
      const confirmation = Modal.confirm({
        title: '发布流程',
        content: '发布前将保存当前定义，然后部署流程模型。确定发布吗？',
        okText: '确认发布',
        afterClose: () => {
          publishConfirmOpen.current = false;
        },
        onOk: async () => {
          if (publishLock.current || session !== saveSession.current) return;
          publishLock.current = true;
          try {
            const publishRes = await publishFlow({
              needsSave: flowSaveSnapshot(savedData.current) !== requestSnapshot,
              save: async () => {
                const response = await flowProcessApi.update(publishData.id, payload);
                if (response.status !== Fa.RES_CODE.OK) throw new Error('保存流程定义失败');
              },
              onSaved: () => {
                if (session !== saveSession.current) return;
                savedData.current = publishData;
                savedDuringSession.current = true;
                setSavedSnapshot(requestSnapshot);
                setSaveState('idle');
              },
              onStage: stage => {
                if (session !== saveSession.current) return;
                setPublishState(stage);
                confirmation.update({ content: stage === 'saving' ? '正在保存流程定义…' : '定义已保存，正在部署流程模型…' });
              },
              deploy: async () => {
                if (session !== saveSession.current) throw new Error('编辑会话已变更');
                const response = await flowProcessApi.publish(payload);
                if (response.status !== Fa.RES_CODE.OK) throw new Error('部署流程模型失败');
                return response;
              },
            });
            if (session !== saveSession.current) return;
            setPublishState('idle');
            FaUtils.showResponse(publishRes, '发布流程');
            savedDuringSession.current = false;
            onSuccess?.();
            if (!embedded) handleClose();
          } catch (error) {
            if (session === saveSession.current) {
              const saveFailed = error instanceof FlowPublishError && error.stage === 'saving';
              const feedback = saveFailed ? '流程定义保存失败，尚未发布；编辑内容已保留，请重试。' : '流程定义已保存，但发布失败；可重试发布，无需重复保存。';
              setPublishState(saveFailed ? 'saveFailed' : 'deployFailed');
              if (saveFailed) setSaveState('failed');
              confirmation.update({ content: <Alert type="error" showIcon title={feedback} />, okText: '重试发布' });
              message.error(feedback);
            }
            throw error;
          } finally {
            publishLock.current = false;
          }
        },
      });
    } catch {
      publishConfirmOpen.current = false;
      message.error('请先完善基础信息');
      // 切换到基础信息步骤
      setCurrent(0);
    }
  }

  function handleValidate() {
    setData({ ...dataRef.current, ...form.getFieldsValue(), ...extendForm.getFieldsValue() });
    setValidationRequested(true);
    setValidationIssue(undefined);
    setCurrent(1);
  }

  function locateIssue(issue: ProcessModelIssue) {
    if (!issue.nodeKey && ['key', 'name'].includes(issue.path)) {
      setCurrent(0);
      message.info(issue.message);
      return;
    }
    setCurrent(1);
    setValidationIssue({ ...issue });
  }

  const editorContent = (
    <div className="fa-full-content fa-flex-column fa-bg-grey2 fa-flow-process-editor">
      <FaFlexRestLayout className="fa-full-content fa-flex-column fa-scroll-hidden" style={{ overflow: 'hidden' }}>
        <div
          className="fa-bg-white fa-mt12 fa-mb12 fa-radius"
          style={{
            display: current === 0 ? undefined : 'none',
            width: 700,
            maxWidth: '100%',
            height: '100%',
            overflow: 'auto',
            padding: 20,
            alignSelf: 'center',
          }}
        >
          <FlowProcessForm
            form={form}
            onFinish={(values) => {
              setData((prev) => ({ ...prev, ...values }));
              message.success('基础信息已应用到当前编辑内容');
            }}
            onValuesChange={(_changed, values) => setData(prev => ({ ...prev, ...values }))}
            initialValues={formInitialValues}
            readOnly={viewOnly}
            fixedFormId={fixedFormId}
            type="edit"
          />
        </div>
        {(current === 1 || designVisited) && (
          <div key={editorSession} className="fa-flex-1 fa-relative" style={{ display: current === 1 ? undefined : 'none', minWidth: 0, minHeight: 0 }}>
            {editorModel.error ? (
              <div className="fa-p12">
                {validation && <FlowValidationPanel result={validation} onLocate={locateIssue} />}
                <Alert type="error" showIcon title="无法展示流程设计" description={editorModel.error} />
              </div>
            ) : (
              <div className="fa-full-content" style={{ minWidth: 0, minHeight: 0 }}>
                <WorkFlowProvider initial={{ flowProcess: data, processModel: editorModel.model as unknown as Flw.ProcessModel, readOnly: !!viewOnly }}>
                  <WorkFlowHistoryScope>
                    <Splitter className="fa-full-content fa-flow-design-splitter" style={{ minWidth: 0, minHeight: 0 }}>
                      <Splitter.Panel>
                        <div className="fa-full fa-relative">
                          <FaWorkFlow
                            flowProcess={data}
                            readOnly={viewOnly}
                            processModel={editorModel.model as unknown as Flw.ProcessModel}
                            validationIssue={validationIssue}
                            onChange={(v) => setData((prev) => ({ ...prev, modelContent: JSON.stringify(v) }))}
                          />
                          {validation && (
                            <div className="fa-flow-validation-overlay">
                              <FlowValidationPanel result={validation} onLocate={locateIssue} />
                            </div>
                          )}
                        </div>
                      </Splitter.Panel>
                      <Splitter.Panel defaultSize={520} min={320} max="45%" collapsible>
                        <div className="fa-full fa-flex-column fa-p12 fa-flow-node-config-panel">
                          <div className="fa-h3 fa-mb12 fa-flow-node-config-title">节点配置</div>
                          <NodeConfigPanel validationIssue={validationIssue} onCancelLocate={() => setValidationIssue(undefined)} />
                        </div>
                      </Splitter.Panel>
                    </Splitter>
                  </WorkFlowHistoryScope>
                </WorkFlowProvider>
              </div>
            )}
          </div>
        )}
        <div
          className="fa-bg-white fa-mt12 fa-mb12 fa-radius"
          style={{
            display: current === 2 ? undefined : 'none',
            width: 700,
            maxWidth: '100%',
            height: '100%',
            overflow: 'auto',
            padding: 20,
            alignSelf: 'center',
          }}
        >
          <Form
            onValuesChange={(_changed, values) => setData(prev => ({ ...prev, ...values }))}
            form={extendForm}
            onFinish={(values) => {
              setData((prev) => ({ ...prev, ...values }));
              message.success('扩展配置已应用到当前编辑内容');
            }}
            {...FaUtils.formItemFullLayout}
          >
            <Form.Item name="submitterPermission" valuePropName="checked" label="提交人权限">
              <Checkbox disabled={viewOnly}>第一个审批节点通过后，提交人仍可撤销申请</Checkbox>
            </Form.Item>
            <Form.Item>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                第一个审批节点通过后，提交人仍可撤销申请（配置前已发起的申请不生效）
              </Text>
            </Form.Item>
          </Form>
        </div>
      </FaFlexRestLayout>
    </div>
  );

  if (viewOnly) {
    return editorContent;
  }

  if (embedded) {
    return (
      <div className="fa-full fa-flex-column fa-flow-process-editor-inline" style={{ minWidth: 0, minHeight: 0 }}>
        <div className="fa-flex-row-center fa-bg-white fa-p12" style={{ flex: '0 0 auto', gap: 16, borderBottom: '1px solid var(--fa-border-color)' }}>
          <div style={{ flex: '0 0 180px', minWidth: 0 }}>
            <Typography.Text strong ellipsis style={{ display: 'block' }}>
              {data.processName || item.processName}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis style={{ display: 'block' }}>
              {data.processKey || item.processKey}
            </Typography.Text>
          </div>
          <div className="fa-flex-1 fa-flex-center" style={{ minWidth: 0 }}>
            <Steps
              style={{ width: 450, maxWidth: '100%' }}
              current={current}
              onChange={setCurrent}
              items={[{ title: '基础信息' }, { title: '流程设计' }, { title: '扩展配置' }]}
            />
          </div>
          {saveStatusTag}
          {publishStatusTag}
          <Button onClick={handleSave} loading={saveState === 'saving'} disabled={loading || !dirty && saveState !== 'failed'}>保存</Button>
          <Button onClick={handleValidate} disabled={loading}>校验流程</Button>
          <Button onClick={handlePublish} type="primary" loading={loading}>
            发布
          </Button>
        </div>
        <div className="fa-flex-1 fa-relative" style={{ minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          {editorContent}
        </div>
      </div>
    );
  }

  return (
    <FaFullContentModal
      title="编辑流程定义"
      triggerDom={triggerDom}
      open={open}
      onOpenChange={handleOpenChange}
      onCancel={requestClose}
      showOk={false}
      showCancel={false}
      headerCenter={
        <Steps
          style={{ width: 450, maxWidth: '100%' }}
          current={current}
          onChange={setCurrent}
          items={[{ title: '基础信息' }, { title: '流程设计' }, { title: '扩展配置' }]}
        />
      }
      headerExtra={
        <>
          {saveStatusTag}
          {publishStatusTag}
          <Button onClick={handleSave} loading={saveState === 'saving'} disabled={loading || !dirty && saveState !== 'failed'}>保存</Button>
          <Button onClick={handleValidate} disabled={loading}>校验流程</Button>
          <Button onClick={handlePublish} type="primary" loading={loading}>
            发布
          </Button>
          <Button onClick={requestClose} disabled={loading}>
            取消
          </Button>
        </>
      }
    >
      {editorContent}
    </FaFullContentModal>
  );
}
