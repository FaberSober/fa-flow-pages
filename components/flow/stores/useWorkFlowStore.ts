// useWorkFlowStore.ts
import { Flow, Flw } from '@features/fa-flow-pages/types';
import { set as lodashSet } from 'lodash';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { findNodeByKey, loopNode } from '../utils';


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
  updateNodeProps: (node: Flw.ParentNode, path: keyof Flw.Node | any, value: any) => void;
  updateNode: (node: Flw.ParentNode) => void;
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

      refreshNode: () => {
        if (get().readOnly) return;
        set(() => {}); // 强制刷新（Immer 下空更新触发渲染）
        get().onChange?.(get().processModel);
      },

      deleteNode: (node) => {
        if (get().readOnly) return;
        set((state) => {
          // loopNode 内部必须是修改 state.processModel.nodeConfig 的逻辑
          loopNode(state.processModel.nodeConfig, (n) => {
            if (n.childNode && n.childNode?.nodeKey === node.nodeKey) {
              n.childNode = n.childNode.childNode;
            }
          });
          if (state.selectedNodeKey === node.nodeKey) state.selectedNodeKey = undefined;
        });
        // ✅ 触发外部 onChange
        get().onChange?.(get().processModel);
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
