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

export interface NavigationTreeItem extends NavigationItem {
  group: boolean;
  children?: NavigationTreeItem[];
}

/** Linear successors remain siblings; only gateways and branch cards introduce nesting. */
export function buildNavigationTree(root?: Flw.Node): NavigationTreeItem[] {
  const visited = new Set<Flw.Node | Flw.ConditionNode>();
  const keys = new Set<string>();
  function walk(node: Flw.Node | Flw.ConditionNode | undefined, path: string[], branchType?: string, defaultBranch = false): NavigationTreeItem[] {
    if (!node || visited.has(node) || keys.has(node.nodeKey)) return [];
    visited.add(node);
    keys.add(node.nodeKey);
    const typeName = branchType ?? labels[node.type as FlwEnums.NodeType] ?? FlwEnums.NodeTypeMap[node.type as FlwEnums.NodeType] ?? '节点';
    const name = defaultBranch ? '默认分支' : node.nodeName?.trim() || typeName;
    const group = !branchType && groups.has(node.type);
    const children: NavigationTreeItem[] = [];
    const config = node as Flw.Node;
    for (const [field, label] of [['conditionNodes', '条件'], ['parallelNodes', '并行'], ['inclusiveNodes', '包容']] as const) {
      const branches = config[field] ?? [];
      branches.forEach((branch, index) => {
        const fallback = field !== 'parallelNodes' && index === branches.length - 1 && hasEmptyConditions(branch.conditionList);
        children.push(...walk(branch, [...path, name], label, fallback));
      });
    }
    if (branchType) children.push(...walk(node.childNode, [...path, name]));
    const item: NavigationTreeItem = { key: node.nodeKey, name, type: node.type, typeName, path: path.join(' / '), group, children: children.length ? children : undefined };
    const result = node.nodeKey ? [item] : children;
    if (!branchType) result.push(...walk(node.childNode, path));
    return result;
  }
  return walk(root, ['主流程']);
}

/** Branch cards are real destinations; gateways and route references are not extra search results. */
export function flattenNavigationTree(tree: NavigationTreeItem[]): NavigationItem[] {
  const items: NavigationItem[] = [];
  for (const item of tree) {
    if (!item.group) items.push(item);
    if (item.children) items.push(...flattenNavigationTree(item.children));
  }
  return items;
}

export function buildNavigationIndex(root?: Flw.Node): NavigationItem[] {
  return flattenNavigationTree(buildNavigationTree(root));
}

export function navigationAncestors(tree: NavigationTreeItem[], key?: string): string[] {
  if (!key) return [];
  for (const item of tree) {
    if (item.key === key) return [];
    if (item.children) {
      if (item.children.some(child => child.key === key)) return [item.key];
      const nested = navigationAncestors(item.children, key);
      if (nested.length) return [item.key, ...nested];
    }
  }
  return [];
}

export function navigationExpandableKeys(tree: NavigationTreeItem[]): string[] {
  return tree.flatMap(item => item.children?.length ? [item.key, ...navigationExpandableKeys(item.children)] : []);
}

export function searchNavigation(items: NavigationItem[], query: string): NavigationItem[] {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return [];
  return items.filter(item => [item.name, item.typeName, item.key].some(text => text.toLocaleLowerCase().includes(value)));
}
