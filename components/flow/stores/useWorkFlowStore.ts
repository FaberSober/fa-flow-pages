// useWorkFlowStore.ts
import { Flow, Flw } from '@features/fa-flow-pages/types';
import { set as lodashSet } from 'lodash';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { findNodeByKey } from '../utils';
import { findNodeContextByKey } from '../nodeLookup';
import { hasEmptyConditions } from '../branchSemantics';

type BranchCollection = 'conditionNodes' | 'parallelNodes' | 'inclusiveNodes';


// 1. 定义状态和方法结构
interface WorkFlowState {
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
  updateNode: (node: Flw.ParentNode) => void;
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
export const useWorkFlowStore = create<WorkFlowState>()(
  devtools(
    immer((set, get) => ({
      // ✅ 状态属性初始值
      flowProcess: {} as Flow.FlowProcess,
      processModel: {} as Flw.ProcessModel,
      selectedNodeKey: undefined,
      renderNodes: {},
      readOnly: false,
      onChange: undefined,

      // ✅ 动作方法实现
      setFlowProcess: (v) => set((state) => { state.flowProcess = v; }),
      setExternalOnChange: (cb) => set((state) => { state.onChange = cb; }),
      setProcessModel: (v) => set((state) => {
        state.processModel = v;
        if (state.selectedNodeKey && (!v?.nodeConfig || !findNodeByKey(v.nodeConfig, state.selectedNodeKey))) {
          state.selectedNodeKey = undefined;
        }
      }),
      selectNode: (nodeKey) => set((state) => { state.selectedNodeKey = nodeKey; }),
      clearSelectedNode: () => set((state) => { state.selectedNodeKey = undefined; }),
      setRenderNodes: (v) => set((state) => { state.renderNodes = v || {}; }),
      setReadOnly: (v) => set((state) => { state.readOnly = v; }),

      insertNode: (parentKey, node) => {
        if (get().readOnly || !get().processModel?.nodeConfig) return;
        let inserted = false;
        set((state) => {
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
        set((state) => {
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
        set((state) => {
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
        set((state) => {
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

      updateNode: (node) => {
        if (get().readOnly) return;
        set((state) => {
          const foundNode: any = findNodeByKey(state.processModel.nodeConfig, node.nodeKey);
          if (foundNode) {
            Object.assign(foundNode, node);
          }
        });
        get().onChange?.(get().processModel);
      },

      updateNodeProps: (node: Flw.ParentNode, path: keyof Flw.Node | any, value: any) => {
        if (get().readOnly) return;
        set((state) => {
          const foundNode: any = findNodeByKey(state.processModel.nodeConfig, node.nodeKey);
          if (foundNode) {
            // foundNode[path] = value; // immer，不支持conditionList[0][0].value语法
            lodashSet(foundNode, path, value); // 使用 lodash 的 set 方法支持更复杂的路径语法
          }
        });
        get().onChange?.(get().processModel);
      },

      updateNodeConfig: (updater: (draft: Flw.ProcessModel) => void) => {
        if (get().readOnly) return;
        set((state) => {
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
        });
      },
    })
  ), { name: 'WorkFlow Store' })
);
