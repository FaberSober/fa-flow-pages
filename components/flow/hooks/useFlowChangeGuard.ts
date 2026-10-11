import { useEffect, useRef } from 'react';
import { useWorkFlowStoreApi } from '../stores/useWorkFlowStore';

/** 丢弃被新输入、历史恢复、切换节点或卸载取代的异步查询。 */
export function useFlowChangeGuard() {
  const store = useWorkFlowStoreApi();
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);
  return () => {
    const id = ++request.current;
    const { modelRevision, selectedNodeKey, processModel } = store.getState();
    return () => id === request.current && !store.getState().readOnly
      && store.getState().processModel === processModel && store.getState().modelRevision === modelRevision && store.getState().selectedNodeKey === selectedNodeKey;
  };
}
