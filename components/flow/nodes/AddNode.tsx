import { type ReactNode, useState } from 'react';
import { Flw, FlwEnums } from "@features/fa-flow-pages/types";
import { Button, Popover } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, PlusOutlined, StopOutlined } from "@ant-design/icons";
import { FaIcon, FaIconBranch, FaIconInclusive, FaIconRoute, FaIconSend, FaIconSlider, FaIconSubFlow, FaIconTrigger } from "@fa/icons";
import { getNodeKey } from "@features/fa-flow-pages/components/flow/utils";
import { useWorkFlowStore } from "@features/fa-flow-pages/components/flow/stores/useWorkFlowStore";

const NodeType = FlwEnums.NodeType
const NodeSetType = FlwEnums.NodeSetType

const nodeGroups: { title: string; items: { type: FlwEnums.NodeType; label: string; description: string; icon: ReactNode }[] }[] = [
  { title: '审批', items: [
    { type: NodeType.approval, label: '审批节点', description: '由指定人员处理', icon: <FaIcon icon="fa-solid fa-stamp" /> },
    { type: NodeType.cc, label: '抄送节点', description: '通知相关人员', icon: <FaIconSend /> },
  ] },
  { title: '分支', items: [
    { type: NodeType.conditionBranch, label: '条件分支', description: '按条件选择路径', icon: <FaIconBranch /> },
    { type: NodeType.parallelBranch, label: '并行分支', description: '多个任务同时进行', icon: <FaIconSlider /> },
    { type: NodeType.inclusiveBranch, label: '包容分支', description: '执行满足条件的路径', icon: <FaIconInclusive /> },
    { type: NodeType.routeBranch, label: '路由分支', description: '跳转到目标节点', icon: <FaIconRoute /> },
  ] },
  { title: '自动化', items: [
    { type: NodeType.timer, label: '延迟等待', description: '等待后继续执行', icon: <ClockCircleOutlined /> },
    { type: NodeType.trigger, label: '触发器', description: '执行指定处理逻辑', icon: <FaIconTrigger /> },
    { type: NodeType.callProcess, label: '子流程', description: '调用其他流程', icon: <FaIconSubFlow /> },
    { type: NodeType.autoPass, label: '自动通过', description: '自动完成审批', icon: <CheckCircleOutlined /> },
    { type: NodeType.autoReject, label: '自动拒绝', description: '自动拒绝审批', icon: <CloseCircleOutlined /> },
    { type: NodeType.end, label: '结束', description: '结束当前流程', icon: <StopOutlined /> },
  ] },
];


export interface AddNodeProps {
  /** 流程配置节点Node JSON */
  parentNode: Flw.ParentNode;
}

/**
 * @author xu.pengfei
 * @date 2025/8/19 21:03
 */
export default function AddNode({parentNode}: AddNodeProps) {
  const insertNode = useWorkFlowStore(state => state.insertNode);
  const readOnly = useWorkFlowStore(state => state.readOnly);
  const [open, setOpen] = useState(false);

  function addType(type: FlwEnums.NodeType) {
    if (readOnly) return;
    let node: Flw.Node;
    switch (type) {
      case NodeType.approval: {
        node = {
          nodeName: "审核",
          nodeKey: getNodeKey(),
          type: NodeType.approval,			//节点类型
          setType: NodeSetType.specifyMembers,			//审核人类型 1，选择成员 3，选择角色
          nodeAssigneeList: [],	//审核人员，根据 setType 确定成员还是角色
          examineLevel: 1,	//指定主管层级
          directorLevel: 1,	//自定义连续主管审批层级
          selectMode: 1,		//发起人自选类型
          termAuto: false,	//审批期限超时自动审批
          term: 0,			//审批期限
          termMode: 1,		//审批期限超时后执行类型
          examineMode: 1,		//多人审批时审批方式
          groupStrategy: 0,		//角色、部门审批策略
          passWeight: 50,		//票签通过比例
          directorMode: 0,	//连续主管审批方式
          remind: false,		//审批提醒
          approveSelf: 1,		//审批人与提交人为同一人时自动跳过
          rejectStrategy: 2,	//驳回到上一节点
          rejectStart: 1,		//驳回后继续往下执行
          childNode: parentNode.childNode,
          extendConfig: {
            btnSubmitValid: true,
          },
        };
      } break
      case NodeType.cc: {
        node = {
          nodeName: "抄送人",
          nodeKey: getNodeKey(),
          type: NodeType.cc,
          userSelectFlag: true,
          nodeAssigneeList: [],
          childNode: parentNode.childNode,
          extendConfig: {},
        };
      } break
      case NodeType.conditionBranch: {
        node = {
          nodeName: "条件路由",
          nodeKey: getNodeKey(),
          type: NodeType.conditionBranch,
          conditionNodes: [
            {
              nodeName: "条件1",
              nodeKey: getNodeKey(),
              type: NodeType.conditionNode,
              priorityLevel: 1,
              conditionMode: 1,
              conditionList: [],
            },
            {
              nodeName: "条件2",
              nodeKey: getNodeKey(),
              type: NodeType.conditionNode,
              priorityLevel: 2,
              conditionMode: 2,
              conditionList: [],
            }
          ],
          childNode: parentNode.childNode,
          extendConfig: {},
        }
      } break
      case NodeType.parallelBranch: {
        node = {
          nodeName: "并行分支",
          nodeKey: getNodeKey(),
          type: NodeType.parallelBranch,
          parallelNodes: [
            {
              nodeName: "分支1",
              nodeKey: getNodeKey(),
              type: NodeType.conditionNode,
              priorityLevel: 1,
              conditionMode: 1,
            },
            {
              nodeName: "分支2",
              nodeKey: getNodeKey(),
              type: NodeType.conditionNode,
              priorityLevel: 2,
              conditionMode: 1,
            }
          ],
          childNode: parentNode.childNode,
          extendConfig: {},
        }
      } break
      case NodeType.inclusiveBranch: {
        node = {
          nodeName: "包容分支",
          nodeKey: getNodeKey(),
          type: NodeType.inclusiveBranch,
          inclusiveNodes: [
            {
              nodeName: "包容条件1",
              nodeKey: getNodeKey(),
              type: NodeType.conditionNode,
              priorityLevel: 1,
              conditionMode: 1,
              conditionList: [],
            },
            {
              nodeName: "包容条件2",
              nodeKey: getNodeKey(),
              type: NodeType.conditionNode,
              priorityLevel: 2,
              conditionMode: 2,
              conditionList: [],
            }
          ],
          childNode: parentNode.childNode,
          extendConfig: {},
        }
      } break
      case NodeType.routeBranch: {
        node = {
          nodeName: "路由分支",
          nodeKey: getNodeKey(),
          type: NodeType.routeBranch,
          routeNodes: [],
          childNode: parentNode.childNode,
          extendConfig: {},
        }
      } break
      case NodeType.timer: {
        node = {
          nodeName: "延迟等待",
          nodeKey: getNodeKey(),
          type: NodeType.timer,
          delayType: FlwEnums.NodeDelayType.FIXED, // 延时处理类型 1，固定时长 2，自动计算
          childNode: parentNode.childNode,
          extendConfig: {
            time: "1:m",
          },
        }
      } break
      case NodeType.trigger: {
        node = {
          nodeName: "触发器",
          nodeKey: getNodeKey(),
          type: NodeType.trigger,
          triggerType: FlwEnums.NodeTriggerType.IMMEDIATE, // 触发器类型 1，立即执行 2，延迟执行
          delayType: FlwEnums.NodeDelayType.FIXED, // 延时处理类型 1，固定时长 2，自动计算
          childNode: parentNode.childNode,
          extendConfig: {
            // time: "1:m",
            // args: "{}",
            trigger: "", // 实现TaskTrigger的class类路径，如：test.mysql.TaskTriggerImpl
          },
        }
      } break
      case NodeType.callProcess: {
        node = {
          nodeName: "子流程",
          nodeKey: getNodeKey(),
          type: NodeType.callProcess,
          callAsync: true,
          childNode: parentNode.childNode,
          extendConfig: {},
        }
      } break
      case NodeType.autoPass: {
        node = {
          nodeName: "自动通过",
          nodeKey: getNodeKey(),
          type: NodeType.autoPass,
          childNode: parentNode.childNode,
          extendConfig: {},
        }
      } break
      case NodeType.autoReject: {
        node = {
          nodeName: "自动拒绝",
          nodeKey: getNodeKey(),
          type: NodeType.autoReject,
          childNode: parentNode.childNode,
          extendConfig: {},
        }
      } break
      case NodeType.end: {
        node = {
          nodeName: "结束",
          nodeKey: getNodeKey(),
          type: NodeType.end,
          extendConfig: {},
        }
      } break
    }
    insertNode(parentNode.nodeKey, node!);
    setOpen(false);
  }

  return (
    <div className="add-node-btn-box">
      <div className="add-node-btn">
        <Popover
          content={(
            <div className="fa-flow-add-node-menu">
              {nodeGroups.map(group => (
                <section key={group.title} aria-label={group.title}>
                  <div className="fa-flow-add-node-group-title">{group.title}</div>
                  <div className="fa-flow-add-node-options">
                    {group.items.map(item => (
                      <Button
                        key={item.type}
                        type="text"
                        className="fa-flow-add-node-option"
                        disabled={readOnly}
                        icon={item.icon}
                        onClick={() => addType(item.type)}
                      >
                        <span><strong>{item.label}</strong><small>{item.description}</small></span>
                      </Button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          title="添加节点"
          trigger="click"
          placement="rightTop"
          open={open && !readOnly}
          onOpenChange={nextOpen => setOpen(!readOnly && nextOpen)}
        >
          <Button aria-label="添加流程节点" disabled={readOnly} shape="circle" icon={<PlusOutlined />} />
        </Popover>
      </div>
    </div>
  )
}
