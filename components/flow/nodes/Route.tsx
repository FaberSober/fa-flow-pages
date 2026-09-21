import { FaIconPro } from "@/components";
import { PlusOutlined } from "@ant-design/icons";
import { useWorkFlowStore } from "@features/fa-flow-pages/components/flow/stores/useWorkFlowStore";
import { Flw, FlwEnums } from "@features/fa-flow-pages/types";
import { Button } from "antd";
import { cloneDeep } from "lodash";
import { useMemo } from 'react';
import { NodeCloseBtn } from '../cubes';
import { useDelNode } from "../hooks";
import AddNode from './AddNode';
import RouteNode from "./RouteNode";


/**
 * 路由分支
 * @author xu.pengfei
 * @date 2025/8/19 22:11
 */
interface RouteProps extends Flw.BasicNodeProps {
  configOnly?: boolean;
}

export default function Route({ node, parentNode, configOnly }: RouteProps) {

  const updateNode = useWorkFlowStore(state => state.updateNode);
  const readOnly = useWorkFlowStore(state => state.readOnly);

  const { delNode } = useDelNode(node, parentNode);

  const text = useMemo(() => {
    if (!node.routeNodes || node.routeNodes.length === 0) {
      return '暂无分支';
    }
    return '路由节点';
  }, [node])

  function handleAddRoute() {
    if (readOnly) return;
    const nodeNew = cloneDeep(node)
    const len = nodeNew.routeNodes!.length + 1
    nodeNew.routeNodes!.push({
      nodeName: '路由' + len,
      nodeKey: undefined!,
      type: FlwEnums.NodeType.routeJump,
      priorityLevel: len,
      conditionMode: 1,
      conditionList: [],
    })
    updateNode(nodeNew);
  }

  function handleDelRoute(index: number) {
    if (readOnly) return;
    const nodeNew = cloneDeep(node)
    nodeNew.routeNodes!.splice(index, 1)
    updateNode(nodeNew);
  }

  function handleRouteNodeChange(index: number, newRouteNode: Flw.ConditionNode) {
    if (readOnly) return;
    const nodeNew = cloneDeep(node)
    nodeNew.routeNodes![index] = newRouteNode;
    updateNode(nodeNew);
  }

  const configContent = (
    <div className="fa-flex-column fa-gap12">
      <div className="fa-flex-column fa-gap12">
        {node.routeNodes && node.routeNodes.map((routeNode, index) => {
          return (
            <div key={index}>
              <RouteNode routeNode={routeNode} readOnly={readOnly} onDel={() => handleDelRoute(index)} onChange={(v) => handleRouteNodeChange(index, v)} />
            </div>
          )
        })}
      </div>
      <Button disabled={readOnly} onClick={handleAddRoute} icon={<PlusOutlined />}>添加路由分支</Button>
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
          {text}
        </div>
      </div>

      <AddNode parentNode={node} />
    </div>
  )
}
