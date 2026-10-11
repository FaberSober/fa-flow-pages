import { createContext, createElement, type ReactNode, useContext, useState } from 'react';
import { useStore } from 'zustand';
import { createWorkFlowStore, type WorkFlowState } from './workFlowStore';

type WorkFlowStore = ReturnType<typeof createWorkFlowStore>;
const WorkFlowContext = createContext<WorkFlowStore | null>(null);

/** 画布和配置面板共享所属编辑器的会话；独立查看器自行创建会话。 */
export function WorkFlowProvider({ children, initial, inherit = false }: {
  children: ReactNode;
  initial?: Parameters<typeof createWorkFlowStore>[0];
  inherit?: boolean;
}) {
  const parent = useContext(WorkFlowContext);
  const [store] = useState(() => inherit && parent ? parent : createWorkFlowStore(initial));
  return createElement(WorkFlowContext.Provider, { value: store }, children);
}

export function useWorkFlowStoreApi() {
  const store = useContext(WorkFlowContext);
  if (!store) throw new Error('流程组件必须位于 WorkFlowProvider 内');
  return store;
}

export function useWorkFlowStore<T>(selector: (state: WorkFlowState) => T): T {
  return useStore(useWorkFlowStoreApi(), selector);
}
