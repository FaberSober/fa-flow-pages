import { FaIconPro } from "@/components";
import { FaFlexRestLayout } from "@fa/ui";
import { Flw } from "@features/fa-flow-pages/types";
import { Tabs } from "antd";
import { useState } from 'react';
import { useNodeAssigneeText } from '../hooks';
import AddNode from './AddNode';
import NodeFormAuth from "./property/NodeFormAuth";
import StartNodeAdvanceForm from "./property/StartNodeAdvanceForm";
import StartNodeBasicForm from './property/StartNodeBasicForm';


export interface PromoterProps {
  /** 流程配置节点Node JSON */
  node: Flw.Node;
  configOnly?: boolean;
}

/**
 * 流程节点-流程发起
 * @author xu.pengfei
 * @date 2025/8/19 20:22
 */
export default function Promoter({ node, configOnly }: PromoterProps) {
  const [tab, setTab] = useState('basic');

  const text = useNodeAssigneeText(node)

  const configContent = (
    <div className="fa-full fa-flex-column" style={{ minWidth: 0 }}>
      <Tabs
        // 基础设置,高级设置,表单权限,流程事件,流程通知,超时处理
        className='fa-tabs-block'
        items={[
          { key: 'basic', label: '基础设置' },
          { key: 'advance', label: '高级设置' },
          { key: 'formAuth', label: '表单权限' },
          { key: 'flowEvent', label: '流程事件' },
          { key: 'flowNotify', label: '流程通知' },
          { key: 'overtime', label: '超时处理' },
        ]}
        activeKey={tab}
        onChange={setTab}
        size='small'
        tabBarGutter={0}
        styles={{
          header: {marginBottom: 0}
        }}
      />
      <FaFlexRestLayout>
        {tab === 'basic' && (<StartNodeBasicForm node={node} />)}
        {tab === 'advance' && (<StartNodeAdvanceForm node={node} />)}
        {tab === 'formAuth' && (<NodeFormAuth node={node} />)}
      </FaFlexRestLayout>
    </div>
  );

  if (configOnly) return configContent;

  return (
    <div className="node-wrap">
      <div className="node-wrap-box start-node">
        <div className="title">
          <FaIconPro icon="fa-solid fa-user-large" />
          <span>{node.nodeName}</span>
        </div>
        <div className="content">
          <span>{text}</span>
        </div>
      </div>

      <AddNode parentNode={node} />
    </div>
  )
}
