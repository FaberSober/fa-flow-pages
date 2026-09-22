import { DepartmentCascade, RbacRoleSelect } from '@/components';
import { departmentApi, rbacRoleApi, userApi } from '@/services';
import { Flw, FlwEnums } from '@/types';
import { FaUtils, FormNumber, UserSearchSelect } from '@fa/ui';
import { Form, Input, InputNumber, Radio } from 'antd';
import { useEffect } from 'react';
import { NodeSetTypeRadio } from '../../cubes';
import { useWorkFlowStore } from '../../stores/useWorkFlowStore';


const { NodeSetType } = FlwEnums;

export interface ApproverNodeBasicFormProps {
  node: Flw.Node;
}

/**
 * @author xu.pengfei
 * @date 2026-01-09 15:20:31
 */
export default function ApproverNodeBasicForm({ node }: ApproverNodeBasicFormProps) {
  const [form] = Form.useForm();
  const setType = Form.useWatch('setType', form);
  const directorMode = Form.useWatch('directorMode', form);

  const updateNode = useWorkFlowStore(state => state.updateNode);
  const readOnly = useWorkFlowStore(state => state.readOnly);

  useEffect(() => {
    form.resetFields();
    const initValues: any = {
      ...node,
      nodeAssigneeIds: node.setType === NodeSetType.designatedCandidate
        ? []
        : (node.nodeAssigneeList || []).map(item => item.id),
      nodeCandidateIds: (node.nodeCandidate?.assignees || node.nodeAssigneeList || []).map(item => item.id),
    }
    if (initValues.setType === NodeSetType.code) {
      initValues.nodeAssigneeCodePath = node.extendConfig?.nodeAssigneeCodePath
    }
    form.setFieldsValue(initValues)
  }, [form, node]);

  async function onChange(fieldsValue: any) {
    try {
      const { nodeAssigneeIds = [], nodeCandidateIds = [], nodeAssigneeCodePath, ...restFv } = fieldsValue;

      let nodeAssigneeList: Flw.FlowActor[] = [];
      let nodeCandidate: Flw.NodeCandidate | undefined;
      if (restFv.setType === NodeSetType.specifyMembers && nodeAssigneeIds.length > 0) {
        const res = await userApi.getByIds(nodeAssigneeIds);
        nodeAssigneeList = res.data.map(i => ({ id: i.id, name: i.name }));
      } else if (restFv.setType === NodeSetType.role && nodeAssigneeIds.length > 0) {
        const res = await rbacRoleApi.getByIds(nodeAssigneeIds);
        nodeAssigneeList = res.data.map(i => ({ id: i.id, name: i.name }));
      } else if (restFv.setType === NodeSetType.department && nodeAssigneeIds.length > 0) {
        const res = await departmentApi.getByIds(nodeAssigneeIds);
        nodeAssigneeList = res.data.map(i => ({ id: i.id, name: i.name }));
      } else if (restFv.setType === NodeSetType.designatedCandidate && nodeCandidateIds.length > 0) {
        const res = await userApi.getByIds(nodeCandidateIds);
        nodeAssigneeList = res.data.map(i => ({ id: i.id, name: i.name }));
        nodeCandidate = {
          ...node.nodeCandidate,
          assignees: nodeAssigneeList,
        };
      }

      const nodeNew = {
        ...node,
        ...restFv,
        nodeAssigneeList,
        nodeCandidate,
        extendConfig: {
          ...node.extendConfig,
          ...(nodeAssigneeCodePath === undefined ? {} : { nodeAssigneeCodePath }),
        },
      }
      if (restFv.setType !== NodeSetType.code) {
        delete nodeNew.extendConfig?.nodeAssigneeCodePath;
      }
      delete (nodeNew as Flw.Node & { nodeAssigneeCodePath?: string }).nodeAssigneeCodePath;
      updateNode(nodeNew);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Form form={form} layout="vertical" disabled={readOnly} className='fa-p12'
      onValuesChange={(cv, av) => {
        const values = { ...av };
        if (FaUtils.hasAnyProp(cv, ['setType'])) {
          form.setFieldsValue({ nodeAssigneeIds: [], nodeCandidateIds: [] });
          values.nodeAssigneeIds = [];
          values.nodeCandidateIds = [];
        }
        onChange(values)
      }}
    >
      <Form.Item name="setType" label="审批人员类型" rules={[{ required: true }]}>
        <NodeSetTypeRadio />
      </Form.Item>
      {setType === NodeSetType.specifyMembers && (
        <Form.Item name="nodeAssigneeIds" label="审批人员" rules={[{ required: true }]}>
          <UserSearchSelect mode="multiple" />
        </Form.Item>
      )}
      {setType === NodeSetType.supervisor && (
        <Form.Item name="examineLevel" label="指定主管" rules={[{ required: true }]}>
          <InputNumber style={{ width: 230 }} addonBefore="发起人的第" addonAfter="级主管" min={1} max={100} changeOnWheel />
        </Form.Item>
      )}
      {setType === NodeSetType.role && (
        <Form.Item name="nodeAssigneeIds" label="选择角色" rules={[{ required: true }]}>
          <RbacRoleSelect mode="multiple" />
        </Form.Item>
      )}
      {setType === NodeSetType.department && (
        <Form.Item name="nodeAssigneeIds" label="选择部门" rules={[{ required: true }]}>
          <DepartmentCascade multiple changeOnSelect={false} />
        </Form.Item>
      )}
      {setType === NodeSetType.initiatorSelected && (
        <Form.Item name="selectMode" label="发起人自选">
          <Radio.Group
            options={[
              { label: '自选一个人', value: 1 },
              { label: '自选多个人', value: 2 },
            ]}
          />
        </Form.Item>
      )}
      {setType === NodeSetType.multiLevelSupervisors && (
        <>
          <Form.Item name="directorMode" label="连续主管审批终点">
            <Radio.Group
              options={[
                { label: '直到最上层主管', value: 0 },
                { label: '自定义审批终点', value: 1 },
              ]}
            />
          </Form.Item>
          {directorMode === 1 && (
            <Form.Item name="directorLevel" label="指定主管" rules={[{ required: true }]}>
              <FormNumber style={{ width: 230 }} addonBefore="直到发起人的第" addonAfter="级主管" min={1} max={100} changeOnWheel />
            </Form.Item>
          )}
        </>
      )}
      {setType === NodeSetType.designatedCandidate && (
        <Form.Item name="nodeCandidateIds" label="候选人" rules={[{ required: true }]}>
          <UserSearchSelect mode="multiple" />
        </Form.Item>
      )}
      {setType === NodeSetType.code && (
        <Form.Item name="nodeAssigneeCodePath" label="代码接口" rules={[{ required: true }]}>
          <Input placeholder='请输入代码接口地址' />
        </Form.Item>
      )}

    </Form>
  );
}
