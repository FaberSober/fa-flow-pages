import NodeCard from '../NodeCard';
import { FaFlexRestLayout } from '@fa/ui';
import { useWorkFlowStore } from "@features/fa-flow-pages/components/flow/stores/useWorkFlowStore";
import { Flw } from "@features/fa-flow-pages/types";
import { Checkbox, Form, Input } from "antd";
import { useMemo } from 'react';
import { useDelNode } from "../hooks";
import AddNode from './AddNode';


/**
 * 子流程
 * @author xu.pengfei
 * @date 2025/8/19 22:11
 */
interface CallProcessProps extends Flw.BasicNodeProps {
  configOnly?: boolean;
}

export default function CallProcess({ node, parentNode, configOnly }: CallProcessProps) {

  const updateNode = useWorkFlowStore(state => state.updateNode);
  const readOnly = useWorkFlowStore(state => state.readOnly);

  const { delNode } = useDelNode(node, parentNode);

  async function handleValuesChange(av: any) {
    const nodeNew = {
      ...node,
      callProcess: av.callProcess,
      callAsync: av.callAsync,
    }
    updateNode(nodeNew)
  }

  const text = useMemo(() => {
    return node.callProcess;
  }, [node])

  const configContent = (
    <Form
      layout="vertical"
      className="fa-flex-column fa-full"
      disabled={readOnly}
      initialValues={{ callProcess: node.callProcess, callAsync: node.callAsync }}
      onValuesChange={(_cv, av) => {
        handleValuesChange(av)
      }}
    >
      <FaFlexRestLayout>
        <Form.Item name="callProcess" label="子流程" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="callAsync" valuePropName="checked">
          <Checkbox>异步执行</Checkbox>
        </Form.Item>
      </FaFlexRestLayout>
    </Form>
  );

  if (configOnly) return configContent;

  return (
    <div className="node-wrap">
      <NodeCard node={node} onDelete={delNode}>
        {text ? text : '请选择子流程'}
      </NodeCard>

      <AddNode parentNode={node} />
    </div>
  )
}
