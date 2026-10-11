import ZoomPanEditor from "@features/fa-flow-pages/components/flow/cubes/ZoomPanEditor";
import { Flow, Flw } from "@features/fa-flow-pages/types";
import { Button, Space, Tag, theme } from 'antd';
import clsx from 'clsx';
import { type CSSProperties, useContext, useLayoutEffect } from 'react';
import './index.scss';
import NodeWrap from './NodeWrap';
import { useWorkFlowStore, WorkFlowProvider } from './stores/useWorkFlowStore';
import { BaseDrawer, ThemeLayoutContext } from "@fa/ui";
import JsonView from '@uiw/react-json-view';
import { lightTheme } from '@uiw/react-json-view/light';
import { darkTheme } from '@uiw/react-json-view/dark';
import { getFlowMinimapShapes } from './utils/flowMinimap';
import type { ProcessModelIssue } from './modelValidation';


export interface FaWorkFlowProps {
  /** 流程配置 */
  flowProcess: Flow.FlowProcess;
  /** 流程配置JSON */
  processModel: Flw.ProcessModel;
  onChange?: (processModel: Flw.ProcessModel) => void;
  /** 流程task节点状态(适用于进行中的流程展示流程节点运行状态) */
  renderNodes?: Record<string, '0' | '1'>;
  /** 是否显示流程图图例 */
  showLegends?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  validationIssue?: ProcessModelIssue;
}

/**
 * workflow editor
 * @author xu.pengfei
 * @date 2025/8/19 17:34
 */
export default function FaWorkFlow(props: FaWorkFlowProps) {
  return (
    <WorkFlowProvider inherit initial={{ flowProcess: props.flowProcess, processModel: props.processModel, onChange: props.onChange, renderNodes: props.renderNodes ?? {}, readOnly: props.readOnly ?? false }}>
      <WorkFlowContent {...props} />
    </WorkFlowProvider>
  );
}

function WorkFlowContent({ flowProcess, processModel, onChange, renderNodes, showLegends, readOnly = false, validationIssue }: FaWorkFlowProps) {
  const { themeDark } = useContext(ThemeLayoutContext);
  const { token } = theme.useToken();
  // 从 Store 中获取设置方法和流程数据
  const setFlowProcess = useWorkFlowStore(state => state.setFlowProcess);
  const setProcessModel = useWorkFlowStore(state => state.setProcessModel);
  const setExternalOnChange = useWorkFlowStore(state => state.setExternalOnChange);
  const setRenderNodes = useWorkFlowStore(state => state.setRenderNodes);
  const setReadOnly = useWorkFlowStore(state => state.setReadOnly);
  const selectNode = useWorkFlowStore(state => state.selectNode);

  useLayoutEffect(() => {
    setFlowProcess(flowProcess);
  }, [flowProcess, setFlowProcess]);

  // 1. 同步外部传入的 processModel 到 Store (仅在 processModel 变化时执行)
  useLayoutEffect(() => {
    setProcessModel(processModel);
  }, [processModel, setProcessModel]);

  useLayoutEffect(() => {
    if (validationIssue?.nodeKey) selectNode(validationIssue.nodeKey);
  }, [validationIssue, selectNode]);

  useLayoutEffect(() => {
    setRenderNodes(renderNodes||{})
  }, [renderNodes, setRenderNodes]);

  useLayoutEffect(() => {
    setReadOnly(readOnly);
  }, [readOnly, setReadOnly]);

  // 2. 同步外部传入的 onChange 回调到 Store
  // 这样 Store 内部的方法就能调用它
  useLayoutEffect(() => {
    setExternalOnChange(onChange);

    // 清理函数：在组件卸载时或 onChange 改变时，清除 Store 中的回调，防止内存泄漏或错误调用。
    return () => {
      setExternalOnChange(undefined);
    }
  }, [onChange, setExternalOnChange]);

  return (
    <ZoomPanEditor
      focusRequest={validationIssue}
      getMinimapShapes={getFlowMinimapShapes}
      leftTop={showLegends && (
        <Space className="fa-flex-row">
          <Tag color="#52c41a" variant="solid">已执行</Tag>
          <Tag color="#faad14" variant="solid">执行中</Tag>
          <Tag color="#909399" variant="solid">未执行</Tag>
        </Space>
      )}
      toolbar={(
        <Space>
          <BaseDrawer triggerDom={<Button>查看JSON</Button>} title="流程配置JSON" size={600} forceRender>
            <JsonView
              value={processModel}
              style={themeDark ? darkTheme : lightTheme}
              collapsed={3}
            />
          </BaseDrawer>
        </Space>
      )}
    >
      <div
        className={clsx('sc-workflow-design', readOnly && 'sc-workflow-design-readonly')}
        style={{
          '--flow-card-bg': token.colorBgContainer,
          '--flow-card-border': token.colorBorderSecondary,
          '--flow-card-text': token.colorText,
          '--flow-card-muted': token.colorTextSecondary,
          '--flow-card-subtle': token.colorTextTertiary,
          '--flow-card-primary': token.colorPrimary,
          '--flow-card-warning': token.colorWarning,
          '--flow-card-success': token.colorSuccess,
          '--flow-card-shadow': token.boxShadowTertiary,
          '--flow-type-start': token.colorPrimary,
          '--flow-type-approval': token.colorWarning,
          '--flow-type-cc': token.colorInfo,
          '--flow-type-route': token.colorError,
          '--flow-type-timer': token.colorWarning,
          '--flow-type-trigger': token.colorSuccess,
          '--flow-type-process': themeDark ? '#b37feb' : '#722ed1',
          '--flow-type-pass': token.colorSuccess,
          '--flow-type-reject': token.colorError,
          '--flow-type-end': token.colorTextSecondary,
        } as CSSProperties}
      >
        <div className="box-scale">
          <NodeWrap node={processModel.nodeConfig} />
        </div>
      </div>
    </ZoomPanEditor>
  )
}
