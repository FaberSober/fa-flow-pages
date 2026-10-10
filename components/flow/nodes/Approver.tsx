import NodeCard from '../NodeCard';
import { FaFlexRestLayout } from '@fa/ui';
import AddNode from "@features/fa-flow-pages/components/flow/nodes/AddNode";
import { Flw, FlwEnums } from "@features/fa-flow-pages/types";
import { Tabs } from "antd";
import { useMemo, useState } from 'react';
import { useDelNode } from "../hooks";
import ApproverNodeBasicForm from './property/ApproverNodeBasicForm';
import ApproverNodeRuleForm from './property/ApproverNodeRuleForm';
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
    } else if (nodeConfig.setType === NodeSetType.designatedCandidate) {
      const candidates = nodeConfig.nodeCandidate?.assignees || nodeConfig.nodeAssigneeList || [];
      return candidates.length > 0 ? '候选人：' + candidates.map(item => item.name).join("、") : false;
    } else if (nodeConfig.setType === NodeSetType.code) {
      return "代码接口指定"
    }
    return false;
  }

  const text = useMemo(() => toText(node), [node])

  const configContent = (
    <div className="fa-full fa-flex-column" style={{ minWidth: 0 }}>
      <Tabs
        // 当前后端契约支持的审批人配置
        className='fa-tabs-block'
        style={{ flex: '0 0 auto', height: 'auto' }}
        items={[
          { key: 'basic', label: '基础设置' },
          { key: 'rule', label: '审批规则' },
          { key: 'formAuth', label: '表单权限' },
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
        {tab === 'rule' && (<ApproverNodeRuleForm node={node} />)}
        {tab === 'formAuth' && (<NodeFormAuth node={node} />)}
      </FaFlexRestLayout>
    </div>
  );

  if (configOnly) return configContent;

  return (
    <div className="node-wrap">
      <NodeCard node={node} onDelete={delNode}>
        {text ? <span>{text}</span> : <span className="placeholder">请选择</span>}
      </NodeCard>

      <AddNode parentNode={node} />
    </div>
  )
}
