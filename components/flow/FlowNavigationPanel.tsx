import { ApartmentOutlined, BranchesOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, FlagOutlined, MailOutlined, SearchOutlined, ThunderboltOutlined, UserOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Input, Tree } from 'antd';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { FlwEnums } from '@features/fa-flow-pages/types';
import { buildNavigationTree, flattenNavigationTree, navigationAncestors, navigationExpandableKeys, searchNavigation, type NavigationTreeItem } from './navigationIndex';
import { useWorkFlowStore } from './stores/useWorkFlowStore';
import './FlowNavigation.scss';

const { NodeType } = FlwEnums;
const icons: Partial<Record<FlwEnums.NodeType, ReactNode>> = {
  [NodeType.major]: <UserOutlined />, [NodeType.approval]: <CheckCircleOutlined />,
  [NodeType.cc]: <MailOutlined />, [NodeType.conditionNode]: <BranchesOutlined />,
  [NodeType.timer]: <ClockCircleOutlined />, [NodeType.trigger]: <ThunderboltOutlined />,
  [NodeType.callProcess]: <ApartmentOutlined />, [NodeType.routeBranch]: <ApartmentOutlined />,
  [NodeType.end]: <FlagOutlined />, [NodeType.autoPass]: <CheckCircleOutlined />,
  [NodeType.autoReject]: <CloseCircleOutlined />,
};

export default function FlowNavigationPanel({ onLocate }: { onLocate: (key: string, group?: boolean) => void }) {
  const model = useWorkFlowStore(state => state.processModel);
  const selected = useWorkFlowStore(state => state.selectedNodeKey);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchId = useId();
  const tree = useMemo(() => buildNavigationTree(model.nodeConfig), [model.nodeConfig]);
  const items = useMemo(() => flattenNavigationTree(tree), [tree]);
  const results = useMemo(() => searchNavigation(items, query), [items, query]);
  const expandable = useMemo(() => navigationExpandableKeys(tree), [tree]);
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => {
    setExpanded(previous => [...new Set([...previous.filter(key => expandable.includes(key)), ...navigationAncestors(tree, selected)])]);
  }, [tree, selected, expandable]);
  return (
    <div className={`fa-flow-navigation${open ? ' is-open' : ''}`}>
      <div className="fa-flow-navigation-header">
        <Button type="text" size="small" icon={<SearchOutlined />} aria-expanded={open} aria-controls={open ? searchId : undefined} onClick={() => setOpen(value => !value)}>流程导航</Button>
        {open && <Button type="text" size="small" icon={<UpOutlined />} aria-label="收起流程导航" onClick={() => setOpen(false)} />}
      </div>
      {open && <div className="fa-flow-navigation-search">
        <Input autoFocus allowClear id={searchId} aria-label="搜索流程节点" placeholder="搜索名称、类型或 Key" prefix={<SearchOutlined />} value={query} onChange={event => setQuery(event.target.value)} />
        <output className="fa-flow-navigation-status">{query.trim() ? `找到 ${results.length} 个节点` : '流程大纲 · 点击节点定位'}</output>
        {!query.trim() && <>
          <div className="fa-flow-navigation-tree-actions">
            <Button type="link" size="small" onClick={() => setExpanded(expandable)}>全部展开</Button>
            <Button type="link" size="small" onClick={() => setExpanded([])}>全部收起</Button>
          </div>
          {!tree.length && <div className="fa-flow-navigation-empty">暂无流程节点</div>}
          <div className="fa-flow-navigation-outline">
            <Tree<NavigationTreeItem>
              blockNode
              treeData={tree}
              expandedKeys={expanded}
              autoExpandParent={false}
              selectedKeys={selected ? [selected] : []}
              onExpand={keys => setExpanded(keys.map(String))}
              onSelect={(_keys, { node }) => onLocate(node.key, node.group)}
              titleRender={item => <span className="fa-flow-navigation-tree-title" title={`${item.typeName} · ${item.path}\nKey: ${item.key}`}>
                <span className="fa-flow-navigation-icon" aria-hidden="true">{icons[item.type as FlwEnums.NodeType] ?? <ApartmentOutlined />}</span>
                <span className="fa-flow-navigation-name">{item.name}</span>
                {item.group && <span className="fa-flow-navigation-group-label">分组</span>}
              </span>}
            />
          </div>
        </>}
        {query.trim() && !results.length && <div className="fa-flow-navigation-empty">没有匹配的节点</div>}
        <ul className="fa-flow-navigation-results" aria-label="节点搜索结果">
          {results.map(item => <li key={item.key}>
            <button type="button" className={`fa-flow-navigation-item${selected === item.key ? ' is-selected' : ''}`} aria-pressed={selected === item.key} title={`${item.name}\n${item.path}\nKey: ${item.key}`} onClick={() => onLocate(item.key)}>
              <span className="fa-flow-navigation-icon" aria-hidden="true">{icons[item.type as FlwEnums.NodeType] ?? <ApartmentOutlined />}</span>
              <span className="fa-flow-navigation-text"><span className="fa-flow-navigation-name">{item.name}</span><span className="fa-flow-navigation-path">{item.typeName} · {item.path}</span></span>
            </button>
          </li>)}
        </ul>
      </div>}
    </div>
  );
}
