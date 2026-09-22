import { Checkbox, Divider, Form, InputNumber, Radio } from 'antd';
import { useEffect } from 'react';
import { Flw, FlwEnums } from '@/types';
import { useWorkFlowStore } from '../../stores/useWorkFlowStore';

export interface ApproverNodeRuleFormProps {
  node: Flw.Node;
}

const GROUP_SET_TYPES = [FlwEnums.NodeSetType.role, FlwEnums.NodeSetType.department];

/**
 * 审批节点的 FlowLong 运行规则配置。
 */
export default function ApproverNodeRuleForm({ node }: ApproverNodeRuleFormProps) {
  const [form] = Form.useForm();
  const examineMode = Form.useWatch('examineMode', form);
  const termAuto = Form.useWatch('termAuto', form);
  const updateNode = useWorkFlowStore((state) => state.updateNode);
  const readOnly = useWorkFlowStore((state) => state.readOnly);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      examineMode: node.examineMode ?? 1,
      groupStrategy: node.groupStrategy ?? 0,
      passWeight: node.passWeight ?? 50,
      termAuto: node.termAuto ?? false,
      term: node.term ?? 0,
      termMode: node.termMode ?? 1,
      remind: node.remind ?? false,
      approveSelf: node.approveSelf ?? 1,
      rejectStrategy: node.rejectStrategy ?? 2,
      rejectStart: node.rejectStart ?? 1,
    });
  }, [form, node]);

  return (
    <Form form={form} layout="vertical" disabled={readOnly} className="fa-p12" onValuesChange={(_, values) => updateNode({ ...node, ...values })}>
      <Form.Item name="examineMode" label="多人审批时审批方式" rules={[{ required: true }]}>
        <Radio.Group
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          options={[
            { label: '按顺序依次审批', value: 1 },
            { label: '会签（每个人必须审批通过）', value: 2 },
            { label: '或签（有一人审批通过即可）', value: 3 },
            { label: '票签（按人员权重计算）', value: 4 },
          ]}
        />
      </Form.Item>
      {examineMode === 4 && (
        <Form.Item
          name="passWeight"
          label="票签通过比例"
          tooltip="所有审批人权重之和达到该比例后通过"
          rules={[{ required: true, type: 'number', min: 1, max: 100 }]}
        >
          <InputNumber min={1} max={100} addonAfter="%" changeOnWheel />
        </Form.Item>
      )}
      {GROUP_SET_TYPES.includes(node.setType as FlwEnums.NodeSetType) && (
        <Form.Item name="groupStrategy" label="角色/部门多人处理方式" rules={[{ required: true }]}>
          <Radio.Group
            options={[
              { label: '认领审批', value: 0 },
              { label: '全部人员参与审批', value: 1 },
            ]}
          />
        </Form.Item>
      )}

      <Divider />

      <Form.Item name="termAuto" valuePropName="checked">
        <Checkbox>超时自动审批</Checkbox>
      </Form.Item>
      {termAuto && (
        <>
          <Form.Item name="term" label="审批期限" tooltip="为 0 则不生效" rules={[{ required: true, type: 'number', min: 0 }]}>
            <InputNumber addonAfter="小时" min={0} max={1000} changeOnWheel />
          </Form.Item>
          <Form.Item name="termMode" label="审批期限超时后执行" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { label: '自动通过', value: 0 },
                { label: '自动拒绝', value: 1 },
              ]}
            />
          </Form.Item>
        </>
      )}

      <Form.Item name="remind" valuePropName="checked">
        <Checkbox>审批提醒</Checkbox>
      </Form.Item>

      <Divider />

      <Form.Item name="approveSelf" label="审批人与提交人为同一人时" rules={[{ required: true }]}>
        <Radio.Group
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          options={[
            { label: '由发起人对自己审批', value: 0 },
            { label: '自动跳过', value: 1 },
            { label: '转交给直接上级审批', value: 2 },
            { label: '转交给部门负责人审批', value: 3 },
          ]}
        />
      </Form.Item>

      <Divider />

      <Form.Item name="rejectStrategy" label="驳回目标" rules={[{ required: true }]}>
        <Radio.Group
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          options={[
            { label: '驳回到发起人', value: 1 },
            { label: '驳回到上一节点', value: 2 },
            { label: '终止审批流程', value: 4 },
            { label: '驳回到模型父节点', value: 5 },
          ]}
        />
      </Form.Item>
      <Form.Item name="rejectStart" label="驳回重新审批策略" rules={[{ required: true }]}>
        <Radio.Group
          options={[
            { label: '继续往下执行', value: 1 },
            { label: '回到上一个节点', value: 2 },
          ]}
        />
      </Form.Item>
    </Form>
  );
}
