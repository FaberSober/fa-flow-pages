import type { Flw } from '@features/fa-flow-pages/types';
import FlwEnums from '../../types/FlwEnums';
import { hasEmptyConditions } from './branchSemantics';

export interface NavigationItem {
  key: string;
  name: string;
  type: number;
  typeName: string;
  path: string;
}

const { NodeType } = FlwEnums;
const groups = new Set([NodeType.conditionBranch, NodeType.parallelBranch, NodeType.inclusiveBranch]);
const labels: Partial<Record<FlwEnums.NodeType, string>> = {
  [NodeType.major]: '发起', [NodeType.conditionNode]: '条件',
  [NodeType.callProcess]: '子流程', [NodeType.timer]: '等待',
  [NodeType.trigger]: '触发', [NodeType.routeBranch]: '路由',
};

/** Branch cards are real destinations; gateways and route references are not extra cards. */
export function buildNavigationIndex(root?: Flw.Node): NavigationItem[] {
  const items: NavigationItem[] = [];
  const visited = new Set<Flw.Node | Flw.ConditionNode>();
  const keys = new Set<string>();
  function walk(node: Flw.Node | Flw.ConditionNode | undefined, path: string[], branchType?: string, defaultBranch = false) {
    if (!node || visited.has(node)) return;
    visited.add(node);
    const typeName = branchType ?? labels[node.type as FlwEnums.NodeType] ?? FlwEnums.NodeTypeMap[node.type as FlwEnums.NodeType] ?? '节点';
    const name = defaultBranch ? '默认分支' : node.nodeName?.trim() || typeName;
    if ((branchType || !groups.has(node.type)) && node.nodeKey && !keys.has(node.nodeKey)) {
      keys.add(node.nodeKey);
      items.push({ key: node.nodeKey, name, type: node.type, typeName, path: path.join(' / ') });
    }
    const config = node as Flw.Node;
    for (const [field, label] of [['conditionNodes', '条件'], ['parallelNodes', '并行'], ['inclusiveNodes', '包容']] as const) {
      const branches = config[field] ?? [];
      branches.forEach((branch, index) => {
        const fallback = field !== 'parallelNodes' && index === branches.length - 1 && hasEmptyConditions(branch.conditionList);
        walk(branch, [...path, name], label, fallback);
      });
    }
    // Main-chain successors are siblings; successors inside a branch retain that branch's path.
    walk(node.childNode, branchType ? [...path, name] : path);
  }
  walk(root, ['主流程']);
  return items;
}

export function searchNavigation(items: NavigationItem[], query: string): NavigationItem[] {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return [];
  return items.filter(item => [item.name, item.typeName, item.key].some(text => text.toLocaleLowerCase().includes(value)));
}
