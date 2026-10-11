import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./modelValidation.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { validateProcessModel, validateProcessModelContent, parseEditorModel, issueConfigTab } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const simpleModel = () => ({
  key: 'leave',
  name: '请假流程',
  nodeConfig: {
    nodeName: '发起人',
    nodeKey: 'start',
    type: 0,
    childNode: { nodeName: '结束', nodeKey: 'end', type: -1 },
  },
});

test('accepts initiator approval without an explicit assignee list but rejects unknown types', () => {
  const model = simpleModel();
  model.nodeConfig.childNode = { nodeKey: 'self', nodeName: '本人审批', type: 1, setType: 5 };
  assert.equal(validateProcessModel(model).valid, true);
  model.nodeConfig.childNode.setType = 99;
  assert.equal(validateProcessModel(model).valid, false);
});

test('issues locate nested branch nodes and retain the full field path and compatibility errors', () => {
  const model = simpleModel();
  model.nodeConfig.childNode = { nodeKey: 'branch', nodeName: '条件路由', type: 9, conditionNodes: [
    { nodeKey: 'condition', nodeName: '条件一', type: 9, priorityLevel: 1, conditionList: [[{ label: '金额', field: '', operator: '>', value: '100' }]], childNode: { nodeKey: 'approval', nodeName: '审批', type: 1, setType: 1, nodeAssigneeList: [], examineMode: 4, passWeight: 101 } },
  ] };
  const result = validateProcessModel(model);
  const actors = result.issues.find(issue => issue.fieldPath === 'nodeAssigneeList');
  assert.equal(actors.nodeKey, 'approval');
  assert.equal(actors.nodeName, '审批');
  assert.equal(actors.path, 'nodeConfig.childNode.conditionNodes[0].childNode.nodeAssigneeList');
  assert.ok(result.errors.includes(`${actors.path}：${actors.message}`));
  assert.equal(result.issues.find(issue => issue.fieldPath === 'conditionList[0][0].field').nodeKey, 'condition');
  assert.equal(issueConfigTab('passWeight'), 'rule');
  assert.equal(issueConfigTab('nodeAssigneeList[0].id'), 'basic');
});

test('safe editor parsing rejects broken JSON and tree shapes but preserves incomplete editable models', () => {
  for (const content of ['{bad', 'null', '{}', JSON.stringify({ nodeConfig: { nodeName: '条件', nodeKey: 'x', type: 9, conditionNodes: [null] } })]) {
    assert.ok(parseEditorModel(content).error);
    assert.equal(parseEditorModel(content).model, undefined);
  }
  const model = simpleModel();
  model.nodeConfig.childNode = { nodeKey: 'approval', nodeName: '', type: 1, setType: 1, nodeAssigneeList: [] };
  assert.deepEqual(parseEditorModel(JSON.stringify(model)).model, model);
  assert.equal(validateProcessModel(model).valid, false);
  assert.deepEqual(validateProcessModelContent('{bad').issues, [{ path: '', message: '流程模型不是有效 JSON' }]);
});

test('route issues locate their editable owner and an unset route target remains renderable', () => {
  const model = simpleModel();
  model.nodeConfig.childNode = { nodeKey: 'router', nodeName: '路由', type: 4, routeNodes: [
    { nodeName: '路由一', type: 12, priorityLevel: 1, conditionList: [] },
  ] };
  assert.deepEqual(parseEditorModel(JSON.stringify(model)).model, model);
  const issue = validateProcessModel(model).issues.find(item => item.fieldPath === 'routeNodes[0].nodeKey');
  assert.equal(issue.nodeKey, 'router');
  assert.equal(issue.nodeName, '路由');
  model.nodeConfig.childNode.routeNodes[0].nodeKey = 'missing';
  const missing = validateProcessModel(model).issues.find(item => /路由目标不存在/.test(item.message));
  assert.equal(missing.nodeKey, 'router');
});

test('accepts a valid simple model and matches the process key', () => {
  assert.deepEqual(validateProcessModel(simpleModel(), 'leave'), { valid: true, errors: [], issues: [] });
});

test('rejects invalid JSON and duplicate node keys', () => {
  assert.equal(validateProcessModelContent('{bad json').valid, false);
  const model = simpleModel();
  model.nodeConfig.childNode.nodeKey = 'start';
  const result = validateProcessModel(model);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /节点 key 重复/);
});

test('rejects incomplete approval and timer configuration', () => {
  const model = simpleModel();
  model.nodeConfig.childNode = {
    nodeName: '审批',
    nodeKey: 'approval',
    type: 1,
    setType: 1,
    nodeAssigneeList: [],
    childNode: { nodeName: '结束', nodeKey: 'end', type: -1 },
  };
  const approvalResult = validateProcessModel(model);
  assert.equal(approvalResult.valid, false);
  assert.match(approvalResult.errors[0], /审批人员不能为空/);

  model.nodeConfig.childNode = {
    nodeName: '定时器',
    nodeKey: 'timer',
    type: 6,
    delayType: 1,
    extendConfig: { time: 'invalid' },
    childNode: { nodeName: '结束', nodeKey: 'end', type: -1 },
  };
  const timerResult = validateProcessModel(model);
  assert.equal(timerResult.valid, false);
  assert.match(timerResult.errors[0], /固定时长/);
});

test('validates approval rule configuration including vote weight', () => {
  const model = simpleModel();
  model.nodeConfig.childNode = {
    nodeName: '审批',
    nodeKey: 'approval',
    type: 1,
    setType: 1,
    nodeAssigneeList: [{ id: 'u1', name: '审批人' }],
    examineMode: 4,
    passWeight: 50,
    groupStrategy: 0,
    termAuto: true,
    term: 8,
    termMode: 1,
    remind: true,
    approveSelf: 1,
    rejectStrategy: 2,
    rejectStart: 1,
    childNode: { nodeName: '结束', nodeKey: 'end', type: -1 },
  };
  assert.equal(validateProcessModel(model).valid, true);

  model.nodeConfig.childNode.passWeight = 101;
  const result = validateProcessModel(model);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /票签通过比例/);
});

test('rejects a route that points to a missing node', () => {
  const model = simpleModel();
  model.nodeConfig.childNode = {
    nodeName: '路由分支',
    nodeKey: 'route',
    type: 23,
    routeNodes: [{ nodeName: '路由', nodeKey: 'missing', type: 22, conditionList: [] }],
    childNode: { nodeName: '结束', nodeKey: 'end', type: -1 },
  };
  const result = validateProcessModel(model);
  assert.equal(result.valid, false);
  assert.match(result.errors.at(-1), /路由目标不存在/);
});
