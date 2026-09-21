import { Flw, FlwEnums } from '@features/fa-flow-pages/types';
import { Input } from 'antd';
import { findNodeByKey } from './utils';
import { useWorkFlowStore } from './stores/useWorkFlowStore';
import {
  Approver,
  AutoPass,
  AutoReject,
  CallProcess,
  End,
  Promoter,
  Route,
  Send,
  Timer,
  Trigger,
} from './nodes';
import BranchNode from './nodes/BranchNode';
import InclusiveNode from './nodes/InclusiveNode';
import ParallelNode from './nodes/ParallelNode';

const emptyConfig = <div className="fa-p12 fa-text-light100">当前节点暂无其他配置</div>;

function renderNodeConfig(node: Flw.Node) {
  const key = node.nodeKey;

  switch (node.type) {
    case FlwEnums.NodeType.major:
      return <Promoter key={key} node={node} configOnly />;
    case FlwEnums.NodeType.approval:
      return <Approver key={key} node={node} parentNode={node} configOnly />;
    case FlwEnums.NodeType.cc:
      return <Send key={key} node={node} parentNode={node} configOnly />;
    case FlwEnums.NodeType.conditionBranch:
      return node.conditionNodes ? (
        <div className="fa-p12 fa-text-light100">请从画布选择具体条件分支配置</div>
      ) : (
        <BranchNode
          key={key}
          node={node as unknown as Flw.ConditionNode}
          parentNode={node}
          index={0}
          conditionText=""
          configOnly
        />
      );
    case FlwEnums.NodeType.parallelBranch:
      return node.parallelNodes ? (
        <div className="fa-p12 fa-text-light100">请从画布选择具体并行分支配置</div>
      ) : (
        <ParallelNode
          key={key}
          node={node as unknown as Flw.ConditionNode}
          parentNode={node}
          index={0}
          conditionText=""
          configOnly
        />
      );
    case FlwEnums.NodeType.inclusiveBranch:
      return node.inclusiveNodes ? (
        <div className="fa-p12 fa-text-light100">请从画布选择具体包容分支配置</div>
      ) : (
        <InclusiveNode
          key={key}
          node={node as unknown as Flw.ConditionNode}
          parentNode={node}
          index={0}
          conditionText=""
          configOnly
        />
      );
    case FlwEnums.NodeType.routeBranch:
      return <Route key={key} node={node} parentNode={node} configOnly />;
    case FlwEnums.NodeType.timer:
      return <Timer key={key} node={node} parentNode={node} configOnly />;
    case FlwEnums.NodeType.trigger:
      return <Trigger key={key} node={node} parentNode={node} configOnly />;
    case FlwEnums.NodeType.callProcess:
      return <CallProcess key={key} node={node} parentNode={node} configOnly />;
    case FlwEnums.NodeType.autoPass:
      return <AutoPass key={key} node={node} parentNode={node} configOnly />;
    case FlwEnums.NodeType.autoReject:
      return <AutoReject key={key} node={node} parentNode={node} configOnly />;
    case FlwEnums.NodeType.end:
      return <End key={key} node={node} parentNode={node} configOnly />;
    default:
      return emptyConfig;
  }
}

export default function NodeConfigPanel() {
  const selectedNodeKey = useWorkFlowStore(state => state.selectedNodeKey);
  const processModel = useWorkFlowStore(state => state.processModel);
  const updateNodeProps = useWorkFlowStore(state => state.updateNodeProps);
  const readOnly = useWorkFlowStore(state => state.readOnly);
  const node = selectedNodeKey && processModel?.nodeConfig
    ? findNodeByKey(processModel.nodeConfig, selectedNodeKey)
    : undefined;

  if (!node) {
    return <div className="fa-flex-1 fa-flex-center fa-text-light100" style={{ minWidth: 0, minHeight: 0 }}>请从画布选择节点查看配置</div>;
  }

  return (
    <div className="fa-flex-1 fa-flex-column" style={{ minWidth: 0, minHeight: 0 }}>
      <Input
        value={node.nodeName}
        disabled={readOnly}
        style={{ flexShrink: 0 }}
        onChange={event => updateNodeProps(node, 'nodeName', event.target.value)}
      />
      <div className="fa-flex-1 fa-scroll-auto-y" style={{ minWidth: 0, minHeight: 0 }}>
        {renderNodeConfig(node)}
      </div>
    </div>
  );
}
