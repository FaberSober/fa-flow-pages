import { Flw, FlwEnums } from "@features/fa-flow-pages/types";
import clsx from 'clsx';
import { isNil } from "lodash";
import { type MouseEvent } from 'react';
import { useNodeCls } from './hooks';
import { Approver, AutoPass, AutoReject, Branch, CallProcess, End, Inclusive, Parallel, Promoter, Route, Send, Timer, Trigger } from "./nodes";
import { useWorkFlowStore } from './stores/useWorkFlowStore';


export interface NodeWrapProps {
  /** 流程配置节点Node JSON */
  node?: Flw.Node;
  parentNode?: Flw.ParentNode;
}

function isNodeActionTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, input, textarea, select, [role="button"], .close, .sort-left, .sort-right, .add-branch'));
}

/**
 * @author xu.pengfei
 * @date 2025/8/19 20:12
 */
export default function NodeWrap({ node, parentNode }: NodeWrapProps) {

  // 判断节点类型,运行中不同类型的task节点状态,展示不同的颜色
  const cls = useNodeCls(node)
  const selectedNodeKey = useWorkFlowStore(state => state.selectedNodeKey);
  const selectNode = useWorkFlowStore(state => state.selectNode);

  if (isNil(node)) return null;

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    const nestedNode = target?.closest('[data-flow-node-key]');
    if (nestedNode && nestedNode !== event.currentTarget) return;
    if (isNodeActionTarget(event.target)) return;

    const conditionNodeKey = target?.closest('.auto-judge')?.querySelector<HTMLElement>('[data-flow-node-key]')?.dataset.flowNodeKey;
    event.preventDefault();
    event.stopPropagation();
    selectNode(conditionNodeKey || node.nodeKey);
  }

  return (
    <div
      className={clsx('fa-workflow-node', cls, selectedNodeKey === node.nodeKey && 'fa-workflow-node-selected')}
      data-flow-node-key={node.nodeKey}
      onClickCapture={handleClickCapture}
    >
      {node.type === FlwEnums.NodeType.major && <Promoter node={node} />}
      {node.type === FlwEnums.NodeType.approval && <Approver node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.cc && <Send node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.conditionBranch && <Branch node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.parallelBranch && <Parallel node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.inclusiveBranch && <Inclusive node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.routeBranch && <Route node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.timer && <Timer node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.trigger && <Trigger node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.callProcess && <CallProcess node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.autoPass && <AutoPass node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.autoReject && <AutoReject node={node} parentNode={parentNode!} />}
      {node.type === FlwEnums.NodeType.end && <End node={node} parentNode={parentNode!} />}

      {node.childNode && <NodeWrap node={node.childNode} parentNode={node} />}
    </div>
  )
}
