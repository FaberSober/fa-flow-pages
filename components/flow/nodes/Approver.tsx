import { FaIconPro } from "@/components";
import { FaFlexRestLayout } from '@fa/ui';
import { NodeCloseBtn } from "@features/fa-flow-pages/components/flow/cubes";
import AddNode from "@features/fa-flow-pages/components/flow/nodes/AddNode";
import { Flw, FlwEnums } from "@features/fa-flow-pages/types";
import { Tabs } from "antd";
import { useMemo, useState } from 'react';
import { useDelNode } from "../hooks";
import ApproverNodeBasicForm from './property/ApproverNodeBasicForm';
import NodeFormAuth from './property/NodeFormAuth';

const { NodeSetType } = FlwEnums;

/**
 * @author xu.pengfei
 * @date 2025/8/19 22:11
 */
interface ApproverProps extends Flw.BasicNodeProps {
  configOnly?: boolean;
}

export default function Approver({ node, parentNode, configOnly }: ApproverProps) {
  const [tab, setTab] = useState('basic');

  const { delNode } = useDelNode(node, parentNode);

  function toText(nodeConfig: Flw.Node) {
    if (nodeConfig.setType === NodeSetType.specifyMembers) {
      if (nodeConfig.nodeAssigneeList && nodeConfig.nodeAssigneeList.length > 0) {
        const users = nodeConfig.nodeAssigneeList.map(item => item.name).join("、")
        return users
      } else {
        return false
      }
    } else if (nodeConfig.setType === NodeSetType.supervisor) {
      return nodeConfig.examineLevel === 1 ? '直接主管' : `发起人的第${nodeConfig.examineLevel}级主管`
    } else if (nodeConfig.setType === NodeSetType.role) {
      if (nodeConfig.nodeAssigneeList && nodeConfig.nodeAssigneeList.length > 0) {
        const roles = nodeConfig.nodeAssigneeList.map(item => item.name).join("、")
        return '角色：' + roles
      } else {
        return false
      }
    } else if (nodeConfig.setType === NodeSetType.department) {
      if (nodeConfig.nodeAssigneeList && nodeConfig.nodeAssigneeList.length > 0) {
        const roles = nodeConfig.nodeAssigneeList.map(item => item.name).join("、")
        return '部门：' + roles
      } else {
        return false
      }
    } else if (nodeConfig.setType === NodeSetType.initiatorSelected) {
      return "发起人自选"
    } else if (nodeConfig.setType === NodeSetType.initiatorThemselves) {
      return "发起人自己"
    } else if (nodeConfig.setType === NodeSetType.multiLevelSupervisors) {
      return "连续多级主管"
    } else if (nodeConfig.setType === NodeSetType.code) {
      return "代码接口指定"
    }
    return false;
  }

  const text = useMemo(() => toText(node), [node])

  const configContent = (
    <div className="fa-full fa-flex-column" style={{ minWidth: 0 }}>
      <Tabs
        // 基础设置,高级设置,表单权限,流程事件,流程通知,超时处理
        className='fa-tabs-block'
        items={[
          { key: 'basic', label: '基础设置' },
          { key: 'advance', label: '高级设置' },
          { key: 'formAuth', label: '表单权限' },
          { key: 'flowEvent', label: '流程事件' },
          { key: 'flowNotify', label: '流程通知' },
          { key: 'overtime', label: '超时处理' },
        ]}
        activeKey={tab}
        onChange={setTab}
        size='small'
        tabBarGutter={0}
        styles={{
          header: {marginBottom: 0}
        }}
      />

      <FaFlexRestLayout>
        {tab === 'basic' && (<ApproverNodeBasicForm node={node} />)}
        {/* {tab === 'advance' && (<StartNodeAdvanceForm node={nodeCopy} />)} */}
        {tab === 'formAuth' && (<NodeFormAuth node={node} />)}
      </FaFlexRestLayout>
    </div>
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
          {text ? <span>{text}</span> : <span className="placeholder">请选择</span>}
        </div>
      </div>

      <AddNode parentNode={node} />
    </div>
  )
}
