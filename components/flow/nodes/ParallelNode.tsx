import { NodeCloseBtn } from "@features/fa-flow-pages/components/flow/cubes";
import { Flw } from "@features/fa-flow-pages/types";
import clsx from 'clsx';
import { ReactNode } from 'react';
import { useWorkFlowStore } from '../stores/useWorkFlowStore';

export interface ParallelNodeProps {
  parentNode: Flw.Node;
  node: Flw.ConditionNode;
  index: number;
  onDel?: () => void;
  conditionText: string | ReactNode;
  configOnly?: boolean;
}

/**
 * @author xu.pengfei
 * @date 2026-01-19 14:10:20
 */
export default function ParallelNode({ node, onDel, conditionText, configOnly }: ParallelNodeProps) {

  const selectedNodeKey = useWorkFlowStore(state => state.selectedNodeKey);
  const selectNode = useWorkFlowStore(state => state.selectNode);

  function handleNodeClick() {
    selectNode(node.nodeKey);
  }

  if (configOnly) return null;

  return (
    <>
      <div
        className={clsx('fa-flex-column', selectedNodeKey === node.nodeKey && 'fa-workflow-node-selected-target')}
        data-flow-node-key={node.nodeKey}
        onClick={handleNodeClick}
      >
        <div className="branch-title">
          <span className="node-title">{node.nodeName}</span>
          <NodeCloseBtn onClick={onDel} />
        </div>

        <div className="content">
          {conditionText ? <span>{conditionText}</span> : <span className="placeholder">请设置条件</span>}
        </div>
      </div>

    </>
  )
}
