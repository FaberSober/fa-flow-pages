import { RbacRoleSelect } from '@/components';
import { rbacRoleApi, userApi } from '@/services';
import { Flw, FlwEnums } from '@/types';
import { UserSearchSelect } from '@fa/ui';
import { Form, Radio } from 'antd';
import { useEffect } from 'react';
import { useWorkFlowStore } from '../../stores/useWorkFlowStore';

const { NodeSetType } = FlwEnums;
const START_ALL = 0;

export interface StartNodeBasicFormProps {
  node: Flw.Node;
}

/**
 * @author xu.pengfei
 * @date 2026-01-02 09:55:40
 */
export default function StartNodeBasicForm({ node }: StartNodeBasicFormProps) {
  const [form] = Form.useForm();
  const setType = Form.useWatch('setType', form);

  const updateNode = useWorkFlowStore(state => state.updateNode);
  const readOnly = useWorkFlowStore(state => state.readOnly);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      setType: node.setType ?? (node.nodeAssigneeList?.length ? NodeSetType.role : START_ALL),
      nodeAssigneeIds: (node.nodeAssigneeList||[]).map(i => i.id),
    })
  }, [form, node]);

  async function onChange(fieldsValue: any) {
    try {
      const nodeAssigneeIds = fieldsValue.nodeAssigneeIds || [];
      let nodeAssigneeList: Flw.FlowActor[] = [];
      if (fieldsValue.setType === NodeSetType.specifyMembers && nodeAssigneeIds.length > 0) {
        const res = await userApi.getByIds(nodeAssigneeIds);
        nodeAssigneeList = res.data.map(i => ({ id: i.id, name: i.name }));
      } else if (fieldsValue.setType === NodeSetType.role && nodeAssigneeIds.length > 0) {
        const res = await rbacRoleApi.getByIds(nodeAssigneeIds);
        nodeAssigneeList = res.data.map(i => ({ id: i.id, name: i.name }));
      }

      const nodeNew = {
        ...node,
        setType: fieldsValue.setType === START_ALL ? undefined : fieldsValue.setType,
        nodeAssigneeList,
      }
      updateNode(nodeNew);
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Form form={form} layout="vertical" disabled={readOnly} className='fa-p12'
      onValuesChange={(cv, av) => {
        const values = { ...av };
        if (Object.hasOwn(cv, 'setType')) {
          form.setFieldsValue({ nodeAssigneeIds: [] });
          values.nodeAssigneeIds = [];
        }
        onChange(values)
      }}
    >
      <Form.Item name="setType" label="发起人类型" tooltip="谁可以发起此审批（流程基础信息中的使用范围仍会生效）">
        <Radio.Group
          options={[
            { label: '所有人', value: START_ALL },
            { label: '指定成员', value: NodeSetType.specifyMembers },
            { label: '指定角色', value: NodeSetType.role },
          ]}
        />
      </Form.Item>
      {setType === NodeSetType.specifyMembers && (
        <Form.Item name="nodeAssigneeIds" label="发起人员" rules={[{ required: true }]}>
          <UserSearchSelect mode="multiple" />
        </Form.Item>
      )}
      {setType === NodeSetType.role && (
        <Form.Item name="nodeAssigneeIds" label="发起角色" rules={[{ required: true }]}>
          <RbacRoleSelect mode="multiple" />
        </Form.Item>
      )}
    </Form>
  );
}
