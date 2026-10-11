import { DeleteOutlined, PartitionOutlined, PlusOutlined } from "@ant-design/icons";
import { FaArrUtils, FaFlexRestLayout } from "@fa/ui";
import { NodeCloseBtn } from "@features/fa-flow-pages/components/flow/cubes";
import { Flw } from "@features/fa-flow-pages/types";
import { Alert, Button, Form, Input, Popconfirm, Select } from "antd";
import clsx from 'clsx';
import { ReactNode } from 'react';
import { useWorkFlowStore } from '../stores/useWorkFlowStore';


export interface InclusiveNodeProps {
  parentNode: Flw.Node;
  node: Flw.ConditionNode;
  index: number;
  elseNode?: boolean; // 是否为 else 节点
  onDel?: () => void;
  conditionText: string | ReactNode;
  configOnly?: boolean;
}

/**
 * BranchNode
 * @author xu.pengfei
 * @date 2026/01/19 16:00
 */
export default function InclusiveNode({ node, parentNode, elseNode, onDel, conditionText, configOnly }: InclusiveNodeProps) {
  const readOnly = useWorkFlowStore(state => state.readOnly);
  const [form] = Form.useForm();

  const updateNodeProps = useWorkFlowStore(state => state.updateNodeProps);
  const selectedNodeKey = useWorkFlowStore(state => state.selectedNodeKey);
  const selectNode = useWorkFlowStore(state => state.selectNode);

  if (configOnly && elseNode) {
    return <Alert type="info" showIcon message="默认分支" description="没有任何条件分支满足时进入此分支；满足多个条件时会执行多条路径。" />;
  }
  function handleNodeClick() {
    selectNode(node.nodeKey);
  }

  return (
    <>
      {!configOnly && (
        <div
          className={clsx('fa-flex-column', selectedNodeKey === node.nodeKey && 'fa-workflow-node-selected-target')}
          data-flow-node-key={node.nodeKey}
          onClick={handleNodeClick}
        >
          <div className="branch-title">
            <span className="node-title fa-flow-branch-title-inclusive" title={elseNode ? '默认分支' : node.nodeName}>
              <PartitionOutlined aria-hidden="true" />{elseNode ? '默认分支' : node.nodeName}
            </span>
            <span className="priority-title">优先级{node.priorityLevel}</span>
            {!elseNode && parentNode.inclusiveNodes?.at(-1)?.nodeKey !== node.nodeKey && <NodeCloseBtn onClick={onDel} />}
          </div>

          <div className="content">
            {conditionText ? <span>{conditionText}</span> : <span className="placeholder">请设置条件</span>}
          </div>
        </div>
      )}

      {configOnly && (
        <Form
          form={form}
          layout="vertical"
          className={clsx('fa-flex-column fa-full', readOnly && 'sc-workflow-design-readonly')}
          // onFinish={onFinish}
          disabled={readOnly}
        >
          <FaFlexRestLayout>
            <div className="fa-flex-column">
              {parentNode.inclusiveNodes?.at(-1)?.nodeKey === node.nodeKey && (
                <Alert
                  type="warning"
                  showIcon
                  message="末尾分支应为默认分支"
                  description="当前条件会保留。请明确清空条件后，将此分支用作其他条件均不满足时的兜底路径。"
                  action={(
                    <Popconfirm title="将此分支设为默认？" description="现有条件将被清空，分支内节点会保留。" disabled={readOnly} onConfirm={() => updateNodeProps(node, 'conditionList', [])}>
                      <Button size="small" disabled={readOnly}>设为默认</Button>
                    </Popconfirm>
                  )}
                />
              )}
              <div className="top-tips">满足以下条件时进入当前分支</div>

              {node.conditionList?.map((conditionGroup, conditionGroupIdx) => {
                return (
                  <div key={conditionGroupIdx}>
                    {conditionGroupIdx !== 0 && <div className="or-branch-link-tip">或满足</div>}

                    <div className="condition-group-editor">
                      <div className="header">
                        <span>条件组 {conditionGroupIdx + 1}</span>

                        <div
                          onClick={() => {
                            updateNodeProps(node, `conditionList`, FaArrUtils.spliceAndReturnSelf([...node.conditionList!], conditionGroupIdx))
                          }}
                          className="fa-normal-btn fa-branch-cond-group-del">
                          <DeleteOutlined />
                        </div>
                      </div>

                      <div className="main-content">
                        {/* 表头：单个条件 */}
                        <div className="fa-flex-row cell-box">
                          <div style={{ width: 60 }} />
                          <div className="fa-flex-1">描述</div>
                          <div className="fa-flex-1">条件字段</div>
                          <div className="fa-flex-1">运算符</div>
                          <div className="fa-flex-1">值</div>
                          <div style={{ width: 60 }} />
                        </div>

                        {conditionGroup.map((condition, idx) => {
                          return (
                            <div key={idx} className="condition-content">
                              <div className="fa-flex-row" style={{ gap: 8 }}>
                                <div style={{ width: 60 }} className="fa-flex-center">{idx === 0 ? '当' : '且'}</div>
                                <Input data-validation-field={`conditionList[${conditionGroupIdx}][${idx}].label`} style={{ flex: 1 }} value={condition.label} placeholder="描述" onChange={e => {
                                  updateNodeProps(node, `conditionList[${conditionGroupIdx}][${idx}].label`, e.target.value)
                                }} />
                                <Input data-validation-field={`conditionList[${conditionGroupIdx}][${idx}].field`} style={{ flex: 1 }} value={condition.field} placeholder="条件字段" onChange={e => {
                                  updateNodeProps(node, `conditionList[${conditionGroupIdx}][${idx}].field`, e.target.value)
                                }} />
                                <Select
                                  style={{ flex: 1 }}
                                  data-validation-field={`conditionList[${conditionGroupIdx}][${idx}].operator`}
                                  value={condition.operator}
                                  onChange={(v) => updateNodeProps(node, `conditionList[${conditionGroupIdx}][${idx}].operator`, v)}
                                  options={[
                                    { value: '==', label: '等于' },
                                    { value: '!=', label: '不等于' },
                                    { value: '>', label: '大于' },
                                    { value: '>=', label: '大于等于' },
                                    { value: '<', label: '小于' },
                                    { value: '<=', label: '小于等于' },
                                    { value: 'include', label: '包含' },
                                    { value: 'notinclude', label: '不包含' },
                                  ]}
                                  placeholder="运算符"
                                />
                                <Input data-validation-field={`conditionList[${conditionGroupIdx}][${idx}].value`} style={{ flex: 1 }} value={condition.value} placeholder="值" onChange={e => {
                                  updateNodeProps(node, `conditionList[${conditionGroupIdx}][${idx}].value`, e.target.value)
                                }} />

                                <div style={{ width: 60 }} className="fa-flex-center">
                                  <div
                                    onClick={() => {
                                      updateNodeProps(node, `conditionList[${conditionGroupIdx}]`, FaArrUtils.spliceAndReturnSelf([...conditionGroup], idx))
                                    }}
                                    className="fa-normal-btn fa-branch-cond-del-btn"
                                  >
                                    <DeleteOutlined />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="sub-content">
                        <Button
                          onClick={() => {
                            updateNodeProps(node, `conditionList[${conditionGroupIdx}]`, [...conditionGroup, {
                              label: '',
                              field: '',
                              operator: '',
                              value: '',
                            }])
                          }}
                          type="link"
                          icon={<PlusOutlined />}
                          className='fa-branch-add-cond-btn'
                        >添加条件</Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <Button
                onClick={() => {
                  updateNodeProps(node, 'conditionList', [...(node.conditionList ?? []), [{
                    label: '',
                    field: '',
                    operator: '',
                    value: '',
                  }]])
                }}
                className='fa-branch-add-cond-group-btn'
                icon={<PlusOutlined />} block variant="filled" color="default">添加条件组</Button>
            </div>

          </FaFlexRestLayout>
        </Form>
      )}
    </>
  )
}
