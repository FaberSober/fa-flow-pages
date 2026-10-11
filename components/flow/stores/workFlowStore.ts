// 每个编辑/查看会话创建独立 Store。
import { Flow, Flw } from '@features/fa-flow-pages/types';
import { set as lodashSet } from 'lodash';
import { create } from 'zustand';
import { produce } from 'immer';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { findNodeByKey } from '../utils';
import { findNodeContextByKey } from '../nodeLookup';
import { hasEmptyConditions } from '../branchSemantics';

type BranchCollection = 'conditionNodes' | 'parallelNodes' | 'inclusiveNodes';


export type WorkFlowConfigTab = 'basic' | 'rule' | 'advance' | 'formAuth';
interface HistoryConfigFocus { nodeKey: string; tab: WorkFlowConfigTab }

interface HistorySnapshot {
  configFocus?: HistoryConfigFocus;
  model: Flw.ProcessModel;
  selectedNodeKey?: string;
}
const HISTORY_LIMIT = 50;

export interface NavigationViewState {
  open: boolean;
  query: string;
  expandedKeys: string[];
  showMinimap: boolean;
  syncedSelection?: string;
}
const initialNavigationView = (): NavigationViewState => ({ open: false, query: '', expandedKeys: [], showMinimap: true });

// 1. 定义状态和方法结构
export interface WorkFlowState {
  navigationView: NavigationViewState;
  setNavigationView: (patch: Partial<NavigationViewState>) => void;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
  modelRevision: number;
  historyConfigFocus?: HistoryConfigFocus;
  lastHistoryEdit?: { key: string; time: number };
  undo: () => void;
  redo: () => void;
  /** 流程配置 */
  flowProcess: Flow.FlowProcess;
  /** workflow config */
  processModel: Flw.ProcessModel;
  /** 当前选中的节点 key */
  selectedNodeKey?: string;
  /** 外部 onChange 回调函数，用于通知父组件数据变化 */
  onChange: ((v: Flw.ProcessModel) => void) | undefined;

  // 动作方法
  setFlowProcess: (v: Flow.FlowProcess) => void;
  setProcessModel: (v: Flw.ProcessModel) => void;
  selectNode: (nodeKey: string) => void;
  clearSelectedNode: () => void;
  setExternalOnChange: (cb: ((v: Flw.ProcessModel) => void) | undefined) => void;
  refreshNode: () => void;
  deleteNode: (node: Flw.Node) => void;
  removeBranch: (gatewayKey: string, branchKey: string, field: BranchCollection) => void;
  addBranch: (gatewayKey: string, branch: Flw.ConditionNode, field: 'conditionNodes' | 'inclusiveNodes') => void;
  updateNodeProps: (node: Flw.ParentNode, path: keyof Flw.Node | any, value: any) => void;
  updateNode: (node: Flw.ParentNode, configTab?: WorkFlowConfigTab) => void;
  insertNode: (parentKey: string, node: Flw.Node) => void;
  updateNodeConfig: (updater: (draft: Flw.ProcessModel) => void) => void;
  clear: () => void;

  /** 流程task节点状态(适用于进行中的流程展示流程节点运行状态) */
  renderNodes?: Record<string, '0' | '1'>;
  setRenderNodes: (v: Record<string, '0' | '1'>) => void;

  readOnly: boolean;
  setReadOnly: (v: boolean) => void;
}

// 2. 定义 Store
export const createWorkFlowStore = (initial: Partial<Pick<WorkFlowState, 'flowProcess' | 'processModel' | 'readOnly' | 'renderNodes' | 'onChange'>> = {}) => create<WorkFlowState>()(
  devtools(
    immer((set, get) => {
      // 先计算模型，再将模型、选择与历史原子发布。
      const edit = (updater: (state: WorkFlowState) => void, mergeKey?: string, configFocus?: HistoryConfigFocus) => {
        const before = get();
        const next = produce(before, updater);
        if (next.processModel === before.processModel) return;
        const time = Date.now();
        const merge = mergeKey && before.lastHistoryEdit?.key === mergeKey && time - before.lastHistoryEdit.time < 800;
        set({
          processModel: next.processModel,
          selectedNodeKey: next.selectedNodeKey,
          historyPast: merge ? before.historyPast : [...before.historyPast, { model: before.processModel, selectedNodeKey: before.selectedNodeKey, configFocus }].slice(-HISTORY_LIMIT),
          historyFuture: [],
          historyConfigFocus: undefined,
          lastHistoryEdit: mergeKey ? { key: mergeKey, time } : undefined,
        });
      };
      const restore = (direction: 'undo' | 'redo') => {
        const state = get();
        const source = direction === 'undo' ? state.historyPast : state.historyFuture;
        const target = source.at(-1);
        if (state.readOnly || !target) return;
        const current = { model: state.processModel, selectedNodeKey: state.selectedNodeKey, configFocus: target.configFocus };
        set({
          processModel: target.model,
          selectedNodeKey: target.configFocus?.nodeKey ?? target.selectedNodeKey,
          historyConfigFocus: target.configFocus,
          historyPast: direction === 'undo' ? source.slice(0, -1) : [...state.historyPast, current].slice(-HISTORY_LIMIT),
          historyFuture: direction === 'redo' ? source.slice(0, -1) : [...state.historyFuture, current].slice(-HISTORY_LIMIT),
          modelRevision: state.modelRevision + 1,
          lastHistoryEdit: undefined,
        });
        get().onChange?.(get().processModel);
      };
      return {
      // ✅ 状态属性初始值
      flowProcess: {} as Flow.FlowProcess,
      processModel: {} as Flw.ProcessModel,
      selectedNodeKey: undefined,
      renderNodes: {},
      readOnly: false,
      onChange: undefined,
      ...initial,
      historyPast: [],
      historyFuture: [],
      modelRevision: 0,
      navigationView: initialNavigationView(),
      setNavigationView: patch => set(state => {
        Object.assign(state.navigationView, patch);
      }),
      undo: () => restore('undo'),
      redo: () => restore('redo'),

      // ✅ 动作方法实现
      setFlowProcess: (v) => set((state) => { state.flowProcess = v; }),
      setExternalOnChange: (cb) => set((state) => { state.onChange = cb; }),
      setProcessModel: (v) => set((state) => {
        // 父组件序列化后的回显不创建历史，也不清空现有历史。
        if (JSON.stringify(state.processModel) === JSON.stringify(v)) return;
        state.processModel = v;
        state.historyPast = [];
        state.historyFuture = [];
        state.historyConfigFocus = undefined;
        state.lastHistoryEdit = undefined;
        state.modelRevision += 1;
        if (state.selectedNodeKey && (!v?.nodeConfig || !findNodeByKey(v.nodeConfig, state.selectedNodeKey))) {
          state.selectedNodeKey = undefined;
        }
      }),
      selectNode: (nodeKey) => set((state) => { state.selectedNodeKey = nodeKey; state.lastHistoryEdit = undefined; state.historyConfigFocus = undefined; }),
      clearSelectedNode: () => set((state) => { state.selectedNodeKey = undefined; }),
      setRenderNodes: (v) => set((state) => { state.renderNodes = v || {}; }),
      setReadOnly: (v) => set((state) => { state.readOnly = v; }),

      insertNode: (parentKey, node) => {
        if (get().readOnly || !get().processModel?.nodeConfig) return;
        let inserted = false;
        edit((state) => {
          const parent = findNodeByKey(state.processModel.nodeConfig, parentKey);
          if (!parent) return;
          parent.childNode = node;
          state.selectedNodeKey = node.conditionNodes?.[0]?.nodeKey ?? node.parallelNodes?.[0]?.nodeKey ?? node.inclusiveNodes?.[0]?.nodeKey ?? node.nodeKey;
          inserted = true;
        });
        if (inserted) get().onChange?.(get().processModel);
      },

      addBranch: (gatewayKey, branch, field) => {
        if (get().readOnly || !get().processModel?.nodeConfig) return;
        let added = false;
        edit((state) => {
          const gateway = findNodeByKey(state.processModel.nodeConfig, gatewayKey);
          const branches = gateway?.[field];
          if (!branches?.length) return;
          branches.splice(branches.length - 1, 0, branch);
          branches.forEach((item, index) => { item.priorityLevel = index + 1; });
          state.selectedNodeKey = branch.nodeKey;
          added = true;
        });
        if (added) get().onChange?.(get().processModel);
      },

      refreshNode: () => {
        if (get().readOnly) return;
        set(() => {}); // 强制刷新（Immer 下空更新触发渲染）
        get().onChange?.(get().processModel);
      },

      deleteNode: (node) => {
        if (get().readOnly || !get().processModel?.nodeConfig) return;
        let removed = false;
        edit((state) => {
          const context = findNodeContextByKey(state.processModel.nodeConfig, node.nodeKey);
          if (!context?.parentNode || context.branchKind) return;
          context.parentNode.childNode = context.node.childNode;
          if (state.selectedNodeKey && !findNodeByKey(state.processModel.nodeConfig, state.selectedNodeKey)) {
            state.selectedNodeKey = context.node.childNode?.nodeKey ?? context.parentNode.nodeKey;
          }
          removed = true;
        });
        if (removed) get().onChange?.(get().processModel);
      },

      removeBranch: (gatewayKey, branchKey, field) => {
        if (get().readOnly || !get().processModel?.nodeConfig) return;
        let removed = false;
        edit((state) => {
          const context = findNodeContextByKey(state.processModel.nodeConfig, gatewayKey);
          if (!context?.parentNode || context.branchKind) return;
          const gateway = context.node;
          const branches = gateway[field];
          const index = branches?.findIndex(branch => branch.nodeKey === branchKey) ?? -1;
          if (!branches || branches.length < 2 || index < 0) return;
          // 条件/包容分支的末项是现有兜底路径，沿用 UI 的删除限制。
          if (field !== 'parallelNodes' && index === branches.length - 1) return;
          branches.splice(index, 1);
          branches.forEach((branch, position) => { branch.priorityLevel = position + 1; });
          let replacementKey = branches[Math.min(index, branches.length - 1)].nodeKey;
          if (branches.length === 1 && (field === 'parallelNodes' || hasEmptyConditions(branches[0].conditionList))) {
            const survivor = branches[0].childNode;
            let tail = survivor;
            let hasTerminal = false;
            while (tail) {
              // 结束(-1)/自动拒绝(31)不应因折叠被接上汇合后续。
              if (tail.type === -1 || tail.type === 31) hasTerminal = true;
              if (!tail.childNode) break;
              tail = tail.childNode;
            }
            if (!hasTerminal || !gateway.childNode) {
              if (tail) tail.childNode = gateway.childNode;
              context.parentNode.childNode = survivor ?? gateway.childNode;
              replacementKey = context.parentNode.childNode?.nodeKey ?? context.parentNode.nodeKey;
            }
          }
          if (state.selectedNodeKey && !findNodeByKey(state.processModel.nodeConfig, state.selectedNodeKey)) {
            state.selectedNodeKey = replacementKey;
          }
          removed = true;
        });
        if (removed) get().onChange?.(get().processModel);
      },

      updateNode: (node, configTab) => {
        if (get().readOnly) return;
        const previous = findNodeByKey(get().processModel.nodeConfig, node.nodeKey);
        const changed = previous ? Object.keys(node).filter(key => JSON.stringify((previous as any)[key]) !== JSON.stringify((node as any)[key])) : [];
        const field = changed.length === 1 && typeof (node as any)[changed[0]] === 'string' ? changed[0] : undefined;
        edit((state) => {
          const foundNode: any = findNodeByKey(state.processModel.nodeConfig, node.nodeKey);
          if (foundNode) {
            Object.assign(foundNode, node);
          }
        }, field ? `${node.nodeKey}:${field}` : undefined, configTab ? { nodeKey: node.nodeKey, tab: configTab } : undefined);
        get().onChange?.(get().processModel);
      },

      updateNodeProps: (node: Flw.ParentNode, path: keyof Flw.Node | any, value: any) => {
        if (get().readOnly) return;
        edit((state) => {
          const foundNode: any = findNodeByKey(state.processModel.nodeConfig, node.nodeKey);
          if (foundNode) {
            // foundNode[path] = value; // immer，不支持conditionList[0][0].value语法
            lodashSet(foundNode, path, value); // 使用 lodash 的 set 方法支持更复杂的路径语法
          }
        }, typeof value === 'string' ? `${node.nodeKey}:${String(path)}` : undefined);
        get().onChange?.(get().processModel);
      },

      updateNodeConfig: (updater: (draft: Flw.ProcessModel) => void) => {
        if (get().readOnly) return;
        edit((state) => {
          updater(state.processModel); // 在 draft.processModel 上执行 updater
        });
        get().onChange?.(get().processModel);
      },

      clear: () => {
        set({
          flowProcess: {} as Flow.FlowProcess,
          processModel: {} as Flw.ProcessModel,
          selectedNodeKey: undefined,
          renderNodes: {},
          readOnly: false,
          onChange: undefined,
          historyPast: [],
          historyFuture: [],
          modelRevision: get().modelRevision + 1,
          lastHistoryEdit: undefined,
          historyConfigFocus: undefined,
          navigationView: initialNavigationView(),
        });
      },
      };
    }),
    { name: 'WorkFlow Store' },
  ),
);
