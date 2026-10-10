import {
  ApartmentOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  FlagOutlined, MailOutlined, ThunderboltOutlined, UserOutlined,
} from '@ant-design/icons';
import { Flw, FlwEnums } from '@features/fa-flow-pages/types';
import { Tooltip } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import { NodeCloseBtn } from './cubes';
import { useWorkFlowStore } from './stores/useWorkFlowStore';

const { NodeType, NodeSetType } = FlwEnums;
const presentations: Partial<Record<FlwEnums.NodeType, { label: string; color: string; icon: ReactNode }>> = {
  [NodeType.major]: { label: '发起', color: 'var(--flow-type-start)', icon: <UserOutlined /> },
  [NodeType.approval]: { label: '审批', color: 'var(--flow-type-approval)', icon: <CheckCircleOutlined /> },
  [NodeType.cc]: { label: '抄送', color: 'var(--flow-type-cc)', icon: <MailOutlined /> },
  [NodeType.routeBranch]: { label: '路由', color: 'var(--flow-type-route)', icon: <ApartmentOutlined /> },
  [NodeType.timer]: { label: '等待', color: 'var(--flow-type-timer)', icon: <ClockCircleOutlined /> },
  [NodeType.trigger]: { label: '触发', color: 'var(--flow-type-trigger)', icon: <ThunderboltOutlined /> },
  [NodeType.callProcess]: { label: '子流程', color: 'var(--flow-type-process)', icon: <ApartmentOutlined /> },
  [NodeType.autoPass]: { label: '自动通过', color: 'var(--flow-type-pass)', icon: <CheckCircleOutlined /> },
  [NodeType.autoReject]: { label: '自动拒绝', color: 'var(--flow-type-reject)', icon: <CloseCircleOutlined /> },
  [NodeType.end]: { label: '结束', color: 'var(--flow-type-end)', icon: <FlagOutlined /> },
};

function configurationHint(node: Flw.Node) {
  if (node.type === NodeType.approval) {
    if ([NodeSetType.specifyMembers, NodeSetType.role, NodeSetType.department].includes(node.setType!) && !node.nodeAssigneeList?.length) {
      return '待配置审批人员';
    }
    if (node.setType === NodeSetType.designatedCandidate && !node.nodeCandidate?.assignees?.length) return '待配置候选人';
    if (node.setType === NodeSetType.code && !node.extendConfig?.nodeAssigneeCodePath?.trim()) return '待配置代码接口';
  }
  if (node.type === NodeType.callProcess && !node.callProcess?.trim()) return '待选择子流程';
  return undefined;
}

function detailText(node: Flw.Node) {
  if (node.type === NodeType.approval) {
    const mode = ({ 1: '依次审批', 2: '会签', 3: '或签', 4: '票签' } as Record<number, string>)[node.examineMode ?? 1];
    return [mode, node.termAuto && node.term ? `超时 ${node.term} 小时` : undefined].filter(Boolean).join(' · ');
  }
  if (node.type === NodeType.cc) return node.nodeAssigneeList?.length ? `${node.nodeAssigneeList.length} 位抄送人员` : '站内信通知';
  if (node.type === NodeType.routeBranch) return `${node.routeNodes?.length ?? 0} 条路由分支`;
  if (node.type === NodeType.callProcess) return node.callAsync ? '异步执行' : '同步执行';
  return undefined;
}

function summaryContent(node: Flw.Node, fallback: ReactNode) {
  if (node.type !== NodeType.timer && node.type !== NodeType.trigger) return fallback;
  if (node.type === NodeType.trigger && node.triggerType === FlwEnums.NodeTriggerType.IMMEDIATE) return fallback;
  const time = node.extendConfig?.time;
  if (!time) return '待配置等待时间';
  const fixed = time.match(/^(\d+):([dhm])$/);
  if (node.delayType === FlwEnums.NodeDelayType.FIXED && fixed) {
    const unit = ({ d: '天', h: '小时', m: '分钟' } as Record<string, string>)[fixed[2]];
    return `等待 ${fixed[1]} ${unit}`;
  }
  return fallback;
}

/** 画布节点的统一外观；类型、配置提示和运行状态分别展示。 */
export default function NodeCard({ node, children, onDelete }: { node: Flw.Node; children: ReactNode; onDelete?: () => void }) {
  const readOnly = useWorkFlowStore(state => state.readOnly);
  const execution = useWorkFlowStore(state => state.renderNodes?.[node.nodeKey]);
  const hasExecutionState = useWorkFlowStore(state => Object.keys(state.renderNodes ?? {}).length > 0);
  const selected = useWorkFlowStore(state => state.selectedNodeKey === node.nodeKey);
  const selectNode = useWorkFlowStore(state => state.selectNode);
  const presentation = presentations[node.type] ?? presentations[NodeType.major]!;
  const hint = readOnly || hasExecutionState ? undefined : configurationHint(node);
  const detail = detailText(node);
  const summary = summaryContent(node, children);
  const status = readOnly || hasExecutionState ? execution === '0' ? 'done' : execution === '1' ? 'active' : 'idle' : undefined;

  return (
    <div
      data-flow-anchor={node.type === NodeType.major ? true : undefined}
      className={`node-wrap-box start-node fa-flow-node-card${hint ? ' fa-flow-node-card-incomplete' : ''}`}
      style={{ '--flow-node-color': presentation.color } as CSSProperties}
    >
      <div className="title">
        <span className="fa-flow-node-icon" aria-hidden="true">{presentation.icon}</span>
        <button
          type="button"
          className="fa-flow-node-name"
          title={node.nodeName}
          aria-pressed={selected}
          onClick={() => selectNode(node.nodeKey)}
        >{node.nodeName}</button>
        {!readOnly && onDelete && <NodeCloseBtn onClick={onDelete} />}
      </div>
      <div className="content">
        <Tooltip title={summary}>
          <div className="fa-flow-node-summary">{summary}</div>
        </Tooltip>
        {detail && <div className="fa-flow-node-detail" title={detail}>{detail}</div>}
      </div>
      <div className="fa-flow-node-footer">
        <span className="fa-flow-node-type">{presentation.label}</span>
        {hint && <span className="fa-flow-node-hint">{hint}</span>}
        {status && <span className={`fa-flow-node-status fa-flow-node-status-${status}`}>
          {status === 'done' ? '已执行' : status === 'active' ? '执行中' : '未执行'}
        </span>}
      </div>
    </div>
  );
}
