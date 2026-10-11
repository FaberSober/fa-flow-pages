import React from 'react';
import { Flw, FlwEnums } from "@features/fa-flow-pages/types";
import { Button } from "antd";
import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import AddNode from './AddNode';
import BranchEntryConnector from '../cubes/BranchEntryConnector';
import '../styles/Branch.scss'
import NodeWrap from "@features/fa-flow-pages/components/flow/NodeWrap";
import BranchNode from "./BranchNode";
import { useWorkFlowStore } from "@features/fa-flow-pages/components/flow/stores/useWorkFlowStore";
import { FaArrUtils } from '@fa/ui';
import { getNodeKey } from "@features/fa-flow-pages/components/flow/utils";
import { hasEmptyConditions } from '../branchSemantics';


/**
 * 条件分支
 * @author xu.pengfei
 * @date 2025/8/19 22:19
 */
export default function Branch({ node }: Flw.BasicNodeProps) {
  const updateNode = useWorkFlowStore(state => state.updateNode);
  const removeBranch = useWorkFlowStore(state => state.removeBranch);
  const addBranch = useWorkFlowStore(state => state.addBranch);

  function addTerm() {
    addBranch(node.nodeKey, {
      nodeName: '条件' + node.conditionNodes!.length,
      nodeKey: getNodeKey(),
      type: FlwEnums.NodeType.conditionNode,
      priorityLevel: node.conditionNodes!.length,
      conditionList: [],
    }, 'conditionNodes');
  }
  /**
   * move condition position
   * @param index
   * @param type -1-move left, 1-move right
   */
  function arrTransfer(index: number, type: number = 1) {
    const conditionNodes = FaArrUtils.arrTransfer(node.conditionNodes!, index, index + type).map((c, i) => ({ ...c, priorityLevel: i + 1 }))
    const nodeNew = {
      ...node,
      conditionNodes,
    }
    updateNode(nodeNew)
  }

  function toText(nodeConfig: Flw.Node, index: number) {
    const { conditionList } = nodeConfig.conditionNodes![index]
    if (conditionList && conditionList.length === 1) {
      const text = conditionList.map((conditionGroup) => conditionGroup.map((item) => `${item.label}${item.operator}${item.value}`)).join(' 和 ')
      return text
    } else if (conditionList && conditionList.length > 1) {
      return conditionList.length + '个条件，或满足'
    } else {
      if (index === nodeConfig.conditionNodes!.length - 1) {
        return '其他条件不满足时进入'
      } else {
        return false
      }
    }
  }

  return (
    <div className="branch-wrap">
      <div className="branch-box-wrap">
        <div className="branch-box">
          <Button onClick={addTerm} shape="round" icon={<PlusOutlined />} className="add-branch">添加条件</Button>

          {/* loop condition */}
          {node.conditionNodes && node.conditionNodes.map((cNode, index) => {
            const conditionText = toText(node, index);
            return (
              <div className="col-box" key={cNode.nodeKey}>
                <div className="branch-connector-top" aria-hidden="true" />
                <div className="branch-connector-bottom" aria-hidden="true" />
                <div className="condition-node">
                  <div className="condition-node-box">
                    <BranchEntryConnector />
                    <div className="auto-judge">
                      {/* move this condition to left */}
                      {index !== 0 && index < node.conditionNodes!.length - 1 && (
                        <div className="sort-left" onClick={() => arrTransfer(index, -1)}>
                          <LeftOutlined />
                        </div>
                      )}

                      <BranchNode
                        parentNode={node}
                        node={cNode}
                        onDel={() => removeBranch(node.nodeKey, cNode.nodeKey, 'conditionNodes')}
                        conditionText={conditionText}
                        index={index}
                        elseNode={index === node.conditionNodes!.length - 1 && hasEmptyConditions(cNode.conditionList)}
                      />

                      {/* move this condition to right */}
                      {index < node.conditionNodes!.length - 2 && node.conditionNodes!.length > 2 && (
                        <div className="sort-right" onClick={() => arrTransfer(index)}>
                          <RightOutlined />
                        </div>
                      )}
                    </div>

                    <AddNode parentNode={cNode} />
                  </div>
                </div>

                {/* condition node's child node */}
                <NodeWrap node={cNode.childNode} parentNode={cNode} />
                <div className="branch-column-tail" aria-hidden="true" />

                {index === 0 && <div className="top-left-cover-line" />}
                {index === 0 && <div className="bottom-left-cover-line" />}

                {index === node.conditionNodes!.length - 1 && <div className="top-right-cover-line" />}
                {index === node.conditionNodes!.length - 1 && <div className="bottom-right-cover-line" />}
              </div>
            )
          })}

        </div>

        <AddNode parentNode={node} />
      </div>
    </div>
  )
}
