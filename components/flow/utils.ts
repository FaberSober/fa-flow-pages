import { Flow, Flw } from "@/types";
import { FaUtils } from "@fa/ui";
import { findNodeContextByKey } from './nodeLookup';

export function getNodeKey() {
  return 'flk_' + Date.now() + "_" + FaUtils.generateId();
}

export function getProcessModel(flowProcess: Flow.FlowProcess|Flow.FlwProcess): Flw.ProcessModel {
  const processModel:Flw.ProcessModel = JSON.parse(flowProcess.modelContent);
  return processModel;
}

/**
 * 根据节点key获取节点配置
 * @param processModel
 * @param nodeKey
 * @returns
 */
export function getNodeConfigByKey(processModel:Flw.ProcessModel, nodeKey: string): Flw.Node | undefined {
  if (!processModel || !processModel.nodeConfig) {
    return undefined;
  }
  return findNodeContextByKey(processModel.nodeConfig, nodeKey)?.node;
}


/** 递归遍历节点 */
export function loopNode(n: Flw.Node, func: (n: Flw.Node) => void) {
  if (n.childNode) {
    loopNode(n.childNode, func)
  }
  func(n)
}

export function findNodeByKey(draftNode: Flw.Node, key: string): Flw.Node | undefined {
  return findNodeContextByKey(draftNode, key)?.node;
}
