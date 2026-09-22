const NODE_TYPE = {
  approval: 1,
  callProcess: 5,
  timer: 6,
  trigger: 7,
} as const;

const NODE_SET_TYPE = {
  specifyMembers: 1,
  supervisor: 2,
  role: 3,
  initiatorSelected: 4,
  multiLevelSupervisors: 6,
  department: 7,
  designatedCandidate: 8,
  code: 20,
} as const;

const NODE_DELAY_TYPE = {
  fixed: 1,
  calculated: 2,
} as const;

const NODE_TRIGGER_TYPE = {
  immediate: 1,
  delay: 2,
} as const;

const MAX_ERRORS = 20;

type JsonObject = Record<string, unknown>;
type BranchKind = 'condition' | 'parallel' | 'inclusive' | 'route';

interface RouteReference {
  path: string;
  target: string;
}

interface ValidationContext {
  errors: string[];
  nodeKeys: Set<string>;
  routeReferences: RouteReference[];
}

export interface ProcessModelValidationResult {
  valid: boolean;
  errors: string[];
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function integer(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function addError(errors: string[], path: string, message: string) {
  if (errors.length < MAX_ERRORS) errors.push(`${path}：${message}`);
}

function extendConfig(node: JsonObject): JsonObject | undefined {
  return isObject(node.extendConfig) ? node.extendConfig : undefined;
}

function validateConditionList(value: unknown, path: string, required: boolean, context: ValidationContext) {
  if (value === undefined) {
    if (required) addError(context.errors, path, '必须是条件数组');
    return;
  }
  if (!Array.isArray(value)) {
    addError(context.errors, path, '必须是二维条件数组');
    return;
  }

  value.forEach((group, groupIndex) => {
    const groupPath = `${path}[${groupIndex}]`;
    if (!Array.isArray(group)) {
      addError(context.errors, groupPath, '条件组必须是数组');
      return;
    }
    if (group.length === 0) {
      addError(context.errors, groupPath, '条件组不能为空');
      return;
    }
    group.forEach((expression, expressionIndex) => {
      const expressionPath = `${groupPath}[${expressionIndex}]`;
      if (!isObject(expression)) {
        addError(context.errors, expressionPath, '条件必须是对象');
        return;
      }
      if (!text(expression.field)) addError(context.errors, expressionPath, '条件字段不能为空');
      if (!text(expression.operator)) addError(context.errors, expressionPath, '条件操作符不能为空');
      if (expression.value === undefined || expression.value === null || text(expression.value) === '') {
        addError(context.errors, expressionPath, '条件值不能为空');
      }
    });
  });
}

function validateActors(value: unknown, path: string, context: ValidationContext) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    addError(context.errors, path, '必须是人员数组');
    return;
  }
  value.forEach((actor, index) => {
    if (!isObject(actor)) {
      addError(context.errors, `${path}[${index}]`, '人员必须是对象');
      return;
    }
    if (!text(actor.id)) addError(context.errors, `${path}[${index}].id`, '人员 ID 不能为空');
  });
}

function validateApprovalNode(node: JsonObject, path: string, context: ValidationContext) {
  const setType = integer(node.setType);
  if (setType === undefined || !Object.values(NODE_SET_TYPE).includes(setType as never)) {
    addError(context.errors, `${path}.setType`, '审批人员类型不合法');
    return;
  }

  validateActors(node.nodeAssigneeList, `${path}.nodeAssigneeList`, context);
  const actors = Array.isArray(node.nodeAssigneeList) ? node.nodeAssigneeList : [];
  if ([NODE_SET_TYPE.specifyMembers, NODE_SET_TYPE.role, NODE_SET_TYPE.department].includes(setType as never) && actors.length === 0) {
    addError(context.errors, `${path}.nodeAssigneeList`, '审批人员不能为空');
  }

  if (setType === NODE_SET_TYPE.supervisor && (!integer(node.examineLevel) || Number(node.examineLevel) < 1)) {
    addError(context.errors, `${path}.examineLevel`, '主管层级必须大于 0');
  }
  if (setType === NODE_SET_TYPE.initiatorSelected && ![1, 2, 3].includes(integer(node.selectMode) ?? -1)) {
    addError(context.errors, `${path}.selectMode`, '发起人自选类型不合法');
  }
  if (setType === NODE_SET_TYPE.multiLevelSupervisors) {
    if (![0, 1].includes(integer(node.directorMode) ?? -1)) {
      addError(context.errors, `${path}.directorMode`, '连续主管审批终点不合法');
    }
    if (node.directorMode === 1 && (!integer(node.directorLevel) || Number(node.directorLevel) < 1)) {
      addError(context.errors, `${path}.directorLevel`, '自定义主管层级必须大于 0');
    }
  }
  if (setType === NODE_SET_TYPE.designatedCandidate) {
    const candidate = isObject(node.nodeCandidate) ? node.nodeCandidate : undefined;
    if (!candidate || !Array.isArray(candidate.assignees) || candidate.assignees.length === 0) {
      addError(context.errors, `${path}.nodeCandidate`, '指定候选人配置不能为空');
    }
  }
  if (setType === NODE_SET_TYPE.code && !text(extendConfig(node)?.nodeAssigneeCodePath)) {
    addError(context.errors, `${path}.extendConfig.nodeAssigneeCodePath`, '代码接口不能为空');
  }

  if (node.termAuto === true) {
    if (typeof node.term !== 'number' || !Number.isFinite(node.term) || node.term < 0) {
      addError(context.errors, `${path}.term`, '审批期限必须是非负数');
    }
    if (![0, 1].includes(integer(node.termMode) ?? -1)) {
      addError(context.errors, `${path}.termMode`, '超时处理方式不合法');
    }
  }

  if (node.examineMode !== undefined && ![1, 2, 3, 4].includes(integer(node.examineMode) ?? -1)) {
    addError(context.errors, `${path}.examineMode`, '多人审批方式不合法');
  }
  if (node.examineMode === 4 && (!integer(node.passWeight) || Number(node.passWeight) < 1 || Number(node.passWeight) > 100)) {
    addError(context.errors, `${path}.passWeight`, '票签通过比例必须在 1 到 100 之间');
  }
  if (node.groupStrategy !== undefined && ![0, 1].includes(integer(node.groupStrategy) ?? -1)) {
    addError(context.errors, `${path}.groupStrategy`, '多人处理方式不合法');
  }
  if (node.remind !== undefined && typeof node.remind !== 'boolean') {
    addError(context.errors, `${path}.remind`, '审批提醒必须是布尔值');
  }
  if (node.approveSelf !== undefined && ![0, 1, 2, 3].includes(integer(node.approveSelf) ?? -1)) {
    addError(context.errors, `${path}.approveSelf`, '同人审批策略不合法');
  }
  if (node.rejectStrategy !== undefined && ![1, 2, 3, 4, 5].includes(integer(node.rejectStrategy) ?? -1)) {
    addError(context.errors, `${path}.rejectStrategy`, '驳回策略不合法');
  }
  if (node.rejectStart !== undefined && ![1, 2].includes(integer(node.rejectStart) ?? -1)) {
    addError(context.errors, `${path}.rejectStart`, '驳回重新审批策略不合法');
  }
}

function validateTimer(node: JsonObject, path: string, context: ValidationContext) {
  const delayType = integer(node.delayType);
  const time = text(extendConfig(node)?.time);
  if (delayType !== NODE_DELAY_TYPE.fixed && delayType !== NODE_DELAY_TYPE.calculated) {
    addError(context.errors, `${path}.delayType`, '定时器延时类型不合法');
  }
  if (!time) {
    addError(context.errors, `${path}.extendConfig.time`, '定时器时间不能为空');
    return;
  }
  if (delayType === NODE_DELAY_TYPE.fixed && !/^\d+:[dhm]$/.test(time)) {
    addError(context.errors, `${path}.extendConfig.time`, '固定时长必须使用数字和 d/h/m 单位');
  }
  if (delayType === NODE_DELAY_TYPE.calculated && !/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    addError(context.errors, `${path}.extendConfig.time`, '自动计算时间必须使用 HH:mm:ss 格式');
  }
}

function validateTrigger(node: JsonObject, path: string, context: ValidationContext) {
  const triggerType = integer(node.triggerType);
  if (triggerType !== NODE_TRIGGER_TYPE.immediate && triggerType !== NODE_TRIGGER_TYPE.delay) {
    addError(context.errors, `${path}.triggerType`, '触发类型不合法');
  }
  if (triggerType === NODE_TRIGGER_TYPE.delay) validateTimer(node, path, context);

  const args = text(extendConfig(node)?.args);
  if (args) {
    try {
      if (!isObject(JSON.parse(args))) addError(context.errors, `${path}.extendConfig.args`, '触发参数必须是 JSON 对象');
    } catch {
      addError(context.errors, `${path}.extendConfig.args`, '触发参数不是有效 JSON');
    }
  }
}

function routeTarget(nodeKey: string): string {
  return text(nodeKey.startsWith('route:') ? nodeKey.slice('route:'.length) : nodeKey);
}

function validateBranchList(value: unknown, path: string, kind: BranchKind, context: ValidationContext) {
  if (!Array.isArray(value)) {
    addError(context.errors, path, '分支列表不能为空');
    return;
  }
  if (value.length === 0) {
    addError(context.errors, path, '至少需要一个分支');
    return;
  }

  value.forEach((branch, index) => {
    const branchPath = `${path}[${index}]`;
    if (!isObject(branch)) {
      addError(context.errors, branchPath, '分支必须是对象');
      return;
    }
    if (!integer(branch.priorityLevel) || Number(branch.priorityLevel) < 1) {
      addError(context.errors, `${branchPath}.priorityLevel`, '分支优先级必须大于 0');
    }
    if (kind !== 'parallel') validateConditionList(branch.conditionList, `${branchPath}.conditionList`, true, context);
    visitNode(branch, branchPath, context, kind === 'route');
  });
}

function visitNode(node: JsonObject, path: string, context: ValidationContext, routeNode = false) {
  const nodeKey = text(node.nodeKey);
  if (!nodeKey) {
    addError(context.errors, `${path}.nodeKey`, '节点 key 不能为空');
  } else if (routeNode) {
    const target = routeTarget(nodeKey);
    if (!target) addError(context.errors, `${path}.nodeKey`, '路由目标不能为空');
    else context.routeReferences.push({ path: `${path}.nodeKey`, target });
  } else if (context.nodeKeys.has(nodeKey)) {
    addError(context.errors, `${path}.nodeKey`, `节点 key 重复：${nodeKey}`);
  } else {
    context.nodeKeys.add(nodeKey);
  }

  if (!text(node.nodeName)) addError(context.errors, `${path}.nodeName`, '节点名称不能为空');
  const nodeType = integer(node.type);
  if (nodeType === undefined) addError(context.errors, `${path}.type`, '节点类型必须是整数');
  if (node.extendConfig !== undefined && !isObject(node.extendConfig)) {
    addError(context.errors, `${path}.extendConfig`, '扩展配置必须是对象');
  }

  if (nodeType === NODE_TYPE.approval) validateApprovalNode(node, path, context);
  if (nodeType === NODE_TYPE.callProcess && !text(node.callProcess)) addError(context.errors, `${path}.callProcess`, '子流程 key 不能为空');
  if (nodeType === NODE_TYPE.timer) validateTimer(node, path, context);
  if (nodeType === NODE_TYPE.trigger) validateTrigger(node, path, context);

  if (node.conditionNodes !== undefined) validateBranchList(node.conditionNodes, `${path}.conditionNodes`, 'condition', context);
  if (node.parallelNodes !== undefined) validateBranchList(node.parallelNodes, `${path}.parallelNodes`, 'parallel', context);
  if (node.inclusiveNodes !== undefined) validateBranchList(node.inclusiveNodes, `${path}.inclusiveNodes`, 'inclusive', context);
  if (node.routeNodes !== undefined) validateBranchList(node.routeNodes, `${path}.routeNodes`, 'route', context);

  if (node.childNode !== undefined) {
    if (!isObject(node.childNode)) addError(context.errors, `${path}.childNode`, '子节点必须是对象');
    else visitNode(node.childNode, `${path}.childNode`, context);
  }
}

export function validateProcessModel(model: unknown, expectedProcessKey?: string): ProcessModelValidationResult {
  const errors: string[] = [];
  if (!isObject(model)) return { valid: false, errors: ['流程模型必须是对象'] };

  const modelKey = text(model.key);
  const modelName = text(model.name);
  if (!modelKey) addError(errors, 'key', '流程 key 不能为空');
  if (!modelName) addError(errors, 'name', '流程名称不能为空');
  if (expectedProcessKey && modelKey && modelKey !== expectedProcessKey) addError(errors, 'key', '流程模型 key 与流程定义 key 不一致');

  const context: ValidationContext = { errors, nodeKeys: new Set(), routeReferences: [] };
  if (!isObject(model.nodeConfig)) addError(errors, 'nodeConfig', '流程节点配置不能为空');
  else visitNode(model.nodeConfig, 'nodeConfig', context);

  for (const reference of context.routeReferences) {
    if (!context.nodeKeys.has(reference.target)) addError(errors, reference.path, `路由目标不存在：${reference.target}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateProcessModelContent(content: unknown, expectedProcessKey?: string): ProcessModelValidationResult {
  if (typeof content !== 'string' || !content.trim()) return { valid: false, errors: ['流程模型内容不能为空'] };
  try {
    return validateProcessModel(JSON.parse(content), expectedProcessKey);
  } catch {
    return { valid: false, errors: ['流程模型不是有效 JSON'] };
  }
}
