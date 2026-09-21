import { FaIconPro } from "@/components";
import { Flw } from "@features/fa-flow-pages/types";
import { NodeCloseBtn } from '../cubes';
import { useDelNode } from "../hooks";


/**
 * @author xu.pengfei
 * @date 2026/01/20 11:00
 */
interface EndProps extends Flw.BasicNodeProps {
  configOnly?: boolean;
}

export default function End({ node, parentNode, configOnly }: EndProps) {
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
          流程结束
        </div>
      </div>
    </div>
  )
}
