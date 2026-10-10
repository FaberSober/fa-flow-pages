import NodeCard from '../NodeCard';
import { Flw } from "@features/fa-flow-pages/types";
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
      <NodeCard node={node} onDelete={delNode}>
        流程结束
      </NodeCard>
    </div>
  )
}
