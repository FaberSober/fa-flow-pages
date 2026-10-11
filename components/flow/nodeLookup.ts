import type { Flw } from '@features/fa-flow-pages/types';

export type BranchKind = 'condition' | 'parallel' | 'inclusive' | 'route';

export interface NodeLookupContext {
  node: Flw.Node;
  parentNode?: Flw.ParentNode;
  branchKind?: BranchKind;
}

function findBranchNode(nodes: Flw.ConditionNode[] | undefined, key: string, parentNode: Flw.Node, branchKind: BranchKind): NodeLookupContext | undefined {
  for (const node of nodes ?? []) {
    if (node.nodeKey === key) {
      return { node: node as Flw.Node, parentNode, branchKind };
    }
    if (node.childNode) {
      const found = findNodeContext(node.childNode, key, node);
      if (found) return found;
    }
  }
  return undefined;
}

function findNodeContext(node: Flw.Node, key: string, parentNode?: Flw.ParentNode): NodeLookupContext | undefined {
  if (node.nodeKey === key) return { node, parentNode };

  if (node.childNode) {
    const found = findNodeContext(node.childNode, key, node);
    if (found) return found;
  }

  const condition = findBranchNode(node.conditionNodes, key, node, 'condition');
  if (condition) return condition;

  const parallel = findBranchNode(node.parallelNodes, key, node, 'parallel');
  if (parallel) return parallel;

  const inclusive = findBranchNode(node.inclusiveNodes, key, node, 'inclusive');
  if (inclusive) return inclusive;

  const route = findBranchNode(node.routeNodes, key, node, 'route');
  if (route) return route;

  return undefined;
}

export function findNodeContextByKey(node: Flw.Node, key: string): NodeLookupContext | undefined {
  return findNodeContext(node, key);
}

/** 统计当前连接之后会被替换的完整子树，包含分支头与各分支内节点。 */
export function countDownstreamNodes(node: Flw.Node | undefined): number {
  if (!node) return 0;
  let count = 1 + countDownstreamNodes(node.childNode);
  for (const branches of [node.conditionNodes, node.parallelNodes, node.inclusiveNodes, node.routeNodes]) {
    for (const branch of branches ?? []) {
      count += 1 + countDownstreamNodes(branch.childNode);
    }
  }
  return count;
}
