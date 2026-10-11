import { RedoOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { useWorkFlowStore, useWorkFlowStoreApi } from './stores/useWorkFlowStore';

export function WorkFlowHistoryScope({ children }: { children: ReactNode }) {
  const store = useWorkFlowStoreApi();
  return (
    <div role="application" aria-label="流程设计编辑区" className="fa-full-content" style={{ minWidth: 0, minHeight: 0 }} tabIndex={-1}
      onPointerDownCapture={event => {
        if (!(event.target instanceof HTMLElement) || event.target.closest('input, textarea, button, a, [role="combobox"], [contenteditable="true"]')) return;
        event.currentTarget.focus({ preventScroll: true });
      }}
      onKeyDown={event => {
        if (event.defaultPrevented || event.nativeEvent.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey) return;
        if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [role="combobox"], [contenteditable="true"]')) return;
        const key = event.key.toLowerCase();
        const redo = key === 'y' || key === 'z' && event.shiftKey;
        if (key !== 'z' && key !== 'y' || store.getState().readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        if (redo) store.getState().redo(); else store.getState().undo();
      }}
    >{children}</div>
  );
}

export function WorkFlowHistoryButtons() {
  const undo = useWorkFlowStore(state => state.undo);
  const redo = useWorkFlowStore(state => state.redo);
  const canUndo = useWorkFlowStore(state => state.historyPast.length > 0);
  const canRedo = useWorkFlowStore(state => state.historyFuture.length > 0);
  const readOnly = useWorkFlowStore(state => state.readOnly);
  if (readOnly) return null;
  return <>
    <Tooltip title="撤销（Ctrl / ⌘ + Z，输入框内保留文本撤销）"><Button icon={<UndoOutlined />} disabled={!canUndo} onClick={undo}>撤销</Button></Tooltip>
    <Tooltip title="重做（Ctrl + Y / ⌘ + Shift + Z）"><Button icon={<RedoOutlined />} disabled={!canRedo} onClick={redo}>重做</Button></Tooltip>
  </>;
}
