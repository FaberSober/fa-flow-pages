import { FaIconPro } from "@/components";
import { FaFlexRestLayout, UserSearchSelect } from '@fa/ui';
import { userApi } from "@features/fa-admin-pages/services";
import { useWorkFlowStore } from "@features/fa-flow-pages/components/flow/stores/useWorkFlowStore";
import { Flw } from "@features/fa-flow-pages/types";
import { Form } from "antd";
import { useMemo } from 'react';
import { NodeCloseBtn } from '../cubes';
import { useDelNode } from "../hooks";
import AddNode from './AddNode';


/**
 * @author xu.pengfei
 * @date 2025/8/19 22:11
 */
interface SendProps extends Flw.BasicNodeProps {
  configOnly?: boolean;
}

export default function Send({ node, parentNode, configOnly }: SendProps) {

  const updateNode = useWorkFlowStore(state => state.updateNode);
  const readOnly = useWorkFlowStore(state => state.readOnly);

  const { delNode } = useDelNode(node, parentNode);

  async function handleValuesChange(av: any) {
    try {
      const res = await userApi.getByIds(av.nodeAssigneeIds);
      const nodeAssigneeList = res.data.map(i => ({ id: i.id, name: i.name }))
      const nodeNew = {
        ...node,
        nodeAssigneeList,
      }
      updateNode(nodeNew)
    } catch (e) {
      console.error(e)
    }
  }

  const text = useMemo(() => {
    if (node.nodeAssigneeList && node.nodeAssigneeList.length > 0) {
      return node.nodeAssigneeList.map(item => item.name).join("、")
    } else {
      return "所有人"
    }
  }, [node])

  const configContent = (
    <Form
      layout="vertical"
      className="fa-flex-column fa-full"
      disabled={readOnly}
      initialValues={{ nodeAssigneeIds: node.nodeAssigneeList?.map(item => item.id) || [] }}
      onValuesChange={(_cv, av) => {
        handleValuesChange(av)
      }}
    >
      <FaFlexRestLayout>
        <Form.Item name="nodeAssigneeIds" label="抄送人员" tooltip="抄送以站内信的形式发送给选定人员">
          <UserSearchSelect mode="multiple" />
        </Form.Item>
      </FaFlexRestLayout>
    </Form>
  );

  if (configOnly) return configContent;

  return (
    <div className="node-wrap">
      <div className="node-wrap-box start-node">
        <div className="title">
          <FaIconPro icon="fa-solid fa-user-large" />
          <span>{node.nodeName}</span>
          <NodeCloseBtn onClick={() => delNode()} />
        </div>
        <div className="content">
          {text ? text : '请选择人员'}
        </div>
      </div>

      <AddNode parentNode={node} />
    </div>
  )
}
