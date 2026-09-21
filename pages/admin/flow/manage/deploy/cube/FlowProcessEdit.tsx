import { Fa, FaFlexRestLayout, FaFullContentModal, FaUtils, useApiLoading } from '@fa/ui';
import { FaWorkFlow } from '@features/fa-flow-pages/components';
import NodeConfigPanel from '@features/fa-flow-pages/components/flow/NodeConfigPanel';
import { flowProcessApi } from '@features/fa-flow-pages/services';
import { Button, Checkbox, Form, Modal, message, Splitter, Steps, Typography } from 'antd';
import { get } from 'lodash';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flow } from '@/types';
import FlowProcessForm from './FlowProcessForm';
import './FlowProcessEdit.scss';

const { Text } = Typography;

interface FlowProcessEditProps {
  item: Flow.FlowProcess;
  onSuccess?: () => void;
  onClose?: () => void;
  triggerDom?: ReactNode;
  viewOnly?: boolean;
}

export default function FlowProcessEdit({ item, onSuccess, onClose, triggerDom, viewOnly }: FlowProcessEditProps) {
  const [data, setData] = useState({ ...item });
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [extendForm] = Form.useForm();
  const publishConfirmOpen = useRef(false);
  const loading = useApiLoading([flowProcessApi.getUrl('update'), flowProcessApi.getUrl('publish')]);

  const handleClose = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    setData({ ...item });
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
        setCurrent(0);
        setData({ ...item });
        form.resetFields();
        form.setFieldsValue(formInitialValues);
        extendForm.resetFields();
        extendForm.setFieldsValue({
          submitterPermission: get(item, 'submitterPermission', false),
        });
      }
      setOpen(nextOpen);
    },
    [extendForm, form, formInitialValues, item],
  );

  async function handlePublish() {
    if (publishConfirmOpen.current) return;
    publishConfirmOpen.current = true;
    try {
      // 校验基础信息表单
      const formValues = await form.validateFields();

      // 获取扩展配置表单数据
      const extendValues = extendForm.getFieldsValue();

      // 组合所有数据
      const publishData = {
        ...data,
        ...formValues,
        ...extendValues,
      };

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

            onSuccess?.();
            handleClose();
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
              message.success('基础信息已保存');
            }}
            initialValues={formInitialValues}
            readOnly={viewOnly}
            type="edit"
          />
        </div>
        {current === 1 && (
          <Splitter className="fa-full-content fa-flow-design-splitter" style={{ minWidth: 0, minHeight: 0 }}>
            <Splitter.Panel>
              <FaWorkFlow
                flowProcess={data}
                readOnly={viewOnly}
                processModel={JSON.parse(data.modelContent)}
                onChange={(v) => setData((prev) => ({ ...prev, modelContent: JSON.stringify(v) }))}
              />
            </Splitter.Panel>
            <Splitter.Panel defaultSize={400} min={320} max="45%" collapsible>
              <div className="fa-full fa-flex-column fa-p12 fa-flow-node-config-panel">
                <div className="fa-h3 fa-mb12 fa-flow-node-config-title">节点配置</div>
                <NodeConfigPanel />
              </div>
            </Splitter.Panel>
          </Splitter>
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
            form={extendForm}
            onFinish={(values) => {
              setData((prev) => ({ ...prev, ...values }));
              message.success('扩展配置已保存');
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
