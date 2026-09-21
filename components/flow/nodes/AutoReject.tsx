import { FaIconPro } from "@/components";
import { Flw } from "@features/fa-flow-pages/types";
import { NodeCloseBtn } from '../cubes';
import { useDelNode } from "../hooks";
import AddNode from './AddNode';


/**
 * @author xu.pengfei
 * @date 2026/01/20 11:00
 */
interface AutoRejectProps extends Flw.BasicNodeProps {
  configOnly?: boolean;
}

export default function AutoReject({ node, parentNode, configOnly }: AutoRejectProps) {
  const { delNode } = useDelNode(node, parentNode);

  if (configOnly) return null;

  return (
    <div className="node-wrap">
      <div className="node-wrap-box start-node">
        <div className="title">
          <FaIconPro icon="fa-solid fa-user-large" />
          <span>{node.nodeName}</span>
          <NodeCloseBtn onClick={() => delNode()} />
        </div>
        <div className="content">
          自动拒绝
        </div>
      </div>

      <AddNode parentNode={node} />
    </div>
  )
}
