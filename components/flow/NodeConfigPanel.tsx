import { Flw, FlwEnums } from '@features/fa-flow-pages/types';
import { Empty, Input, Tag } from 'antd';
import { findNodeContextByKey, type NodeLookupContext } from './nodeLookup';
import {
  Approver,
  CallProcess,
  Promoter,
  Route,
  Send,
  Timer,
  Trigger,
} from './nodes';
import BranchNode from './nodes/BranchNode';
import InclusiveNode from './nodes/InclusiveNode';
import ParallelNode from './nodes/ParallelNode';
import { useWorkFlowStore } from './stores/useWorkFlowStore';

const emptyConfig = <div className="fa-p12 fa-text-light100">当前节点暂无其他配置</div>;

function renderNodeConfig({ node, parentNode, branchKind }: NodeLookupContext) {
  const key = node.nodeKey;

  if (branchKind === 'condition') {
    return (
      <BranchNode
        key={key}
        node={node as unknown as Flw.ConditionNode}
        parentNode={parentNode as Flw.Node}
        index={0}
        conditionText=""
        configOnly
      />
    );
  }
  if (branchKind === 'parallel') {
    return (
      <ParallelNode
        key={key}
        node={node as unknown as Flw.ConditionNode}
        parentNode={parentNode as Flw.Node}
        index={0}
        conditionText=""
        configOnly
      />
    );
  }
  if (branchKind === 'inclusive') {
    return (
      <InclusiveNode
        key={key}
        node={node as unknown as Flw.ConditionNode}
        parentNode={parentNode as Flw.Node}
        index={0}
        conditionText=""
        configOnly
      />
    );
  }
  if (branchKind === 'route' && parentNode) {
    return <Route key={key} node={parentNode as Flw.Node} parentNode={parentNode as Flw.Node} configOnly />;
  }

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
      return <div className="fa-p12 fa-text-light100">此节点会自动通过，无需额外配置。</div>;
    case FlwEnums.NodeType.autoReject:
      return <div className="fa-p12 fa-text-light100">此节点会自动拒绝，无需额外配置。</div>;
    case FlwEnums.NodeType.end:
      return <div className="fa-p12 fa-text-light100">流程到此结束，无需额外配置。</div>;
    default:
      return emptyConfig;
  }
}

export default function NodeConfigPanel() {
  const selectedNodeKey = useWorkFlowStore(state => state.selectedNodeKey);
  const processModel = useWorkFlowStore(state => state.processModel);
  const updateNodeProps = useWorkFlowStore(state => state.updateNodeProps);
  const readOnly = useWorkFlowStore(state => state.readOnly);
  const nodeContext = selectedNodeKey && processModel?.nodeConfig
    ? findNodeContextByKey(processModel.nodeConfig, selectedNodeKey)
    : undefined;

  if (!nodeContext) {
    return <div className="fa-flex-1 fa-flex-center"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择画布节点，或点击连线上的 + 添加节点" /></div>;
  }
  const { node } = nodeContext;
  const hasTabs = node.type === FlwEnums.NodeType.major || node.type === FlwEnums.NodeType.approval;
  const typeName = nodeContext.branchKind
    ? ({ condition: '条件分支', inclusive: '包容分支', parallel: '并行分支', route: '路由分支' })[nodeContext.branchKind]
    : FlwEnums.NodeTypeMap[node.type];

  return (
    <div className="fa-flex-1 fa-flex-column" style={{ minWidth: 0, minHeight: 0 }}>
      <div className="fa-flow-config-header">
        <div className="fa-flow-config-type"><Tag color="processing">{typeName || '节点配置'}</Tag><span>{readOnly ? '只读查看' : '修改会实时应用到画布'}</span></div>
        <label htmlFor="flow-node-name">节点名称</label>
        <Input
          id="flow-node-name"
          value={node.nodeName}
          disabled={readOnly}
          placeholder="请输入节点名称"
          onChange={event => updateNodeProps(node, 'nodeName', event.target.value)}
        />
      </div>
      <div className={`fa-flex-1 fa-flow-config-content${hasTabs ? ' fa-flow-config-content-tabs' : ''}`}>
        {renderNodeConfig(nodeContext)}
      </div>
    </div>
  );
}
