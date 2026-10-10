import NodeCard from '../NodeCard';
import { Flw } from "@features/fa-flow-pages/types";
import { useDelNode } from "../hooks";
import AddNode from './AddNode';


/**
 * @author xu.pengfei
 * @date 2026/01/20 11:00
 */
interface AutoPassProps extends Flw.BasicNodeProps {
  configOnly?: boolean;
}

export default function AutoPass({ node, parentNode, configOnly }: AutoPassProps) {
  const { delNode } = useDelNode(node, parentNode);

  if (configOnly) return null;

  return (
    <div className="node-wrap">
      <NodeCard node={node} onDelete={delNode}>
        自动通过
      </NodeCard>

      <AddNode parentNode={node} />
    </div>
  )
}
