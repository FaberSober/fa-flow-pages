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
      setOpen(nextOpen);
    },
    [extendForm, form, formInitialValues, item],
  );

  const dirty = flowSaveSnapshot(data) !== savedSnapshot;
  const saveStatus = saveState === 'saving' ? '保存中' : saveState === 'failed' ? '保存失败' : dirty ? '未保存' : '已保存';
  const saveStatusTag = <Tooltip title="保存定义不部署模型；基础信息和流程状态保存后立即生效"><Tag color={saveState === 'saving' ? 'processing' : saveState === 'failed' ? 'error' : dirty ? 'warning' : 'success'}>{saveStatus}</Tag></Tooltip>;

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
    if (publishConfirmOpen.current || saveLock.current || loading) return;
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

      Modal.confirm({
        title: '发布流程',
        content: '确定要发布该流程吗？',
        afterClose: () => {
          publishConfirmOpen.current = false;
        },
        onOk: async () => {
          try {
            // 先更新表单信息
            const updateRes = await flowProcessApi.update(publishData.id, publishData);
            if (updateRes.status !== Fa.RES_CODE.OK) throw new Error('更新流程信息失败');

            // 然后发布流程配置
            const publishRes = await flowProcessApi.publish(publishData);
            if (publishRes.status !== Fa.RES_CODE.OK) throw new Error('发布流程失败');
            FaUtils.showResponse(publishRes, '发布流程');

            savedDuringSession.current = false;
            onSuccess?.();
            if (!embedded) handleClose();
          } catch (error) {
            message.error('发布流程失败');
            console.error('发布流程错误:', error);
            throw error;
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
      onCancel={handleClose}
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
          <Button onClick={handleSave} loading={saveState === 'saving'} disabled={loading || !dirty && saveState !== 'failed'}>保存</Button>
          <Button onClick={handleValidate} disabled={loading}>校验流程</Button>
          <Button onClick={handlePublish} type="primary" loading={loading}>
            发布
          </Button>
          <Button onClick={handleClose} disabled={loading}>
            取消
          </Button>
        </>
      }
    >
      {editorContent}
    </FaFullContentModal>
  );
}
