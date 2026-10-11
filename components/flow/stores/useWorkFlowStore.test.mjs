import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const compile = source => {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
};

const lookupUrl = compile(await readFile(new URL('../nodeLookup.ts', import.meta.url), 'utf8'));
// UI ID generation is not used by these Store tests; keep the real lookup/traversal functions.
const utilsSource = (await readFile(new URL('../utils.ts', import.meta.url), 'utf8'))
  .replace('import { FaUtils } from "@fa/ui";', '')
  .replace("'./nodeLookup'", JSON.stringify(lookupUrl));
let source = (await readFile(new URL('./useWorkFlowStore.ts', import.meta.url), 'utf8'))
  .replace("'../branchSemantics'", JSON.stringify(compile(await readFile(new URL('../branchSemantics.ts', import.meta.url), 'utf8'))))
  .replace("'../nodeLookup'", JSON.stringify(lookupUrl))
  .replace("'../utils'", JSON.stringify(compile(utilsSource)))
  .replace("import { set as lodashSet } from 'lodash';", `import lodash from ${JSON.stringify(import.meta.resolve('lodash'))}; const lodashSet = lodash.set;`);
for (const dependency of ['zustand', 'zustand/middleware', 'zustand/middleware/immer']) {
  source = source.replace(`'${dependency}'`, JSON.stringify(import.meta.resolve(dependency)));
}
const { useWorkFlowStore: store } = await import(compile(source));
const end = () => ({ nodeKey: 'end', nodeName: '结束', type: -1 });
const model = () => ({ key: 'test', name: '测试', nodeConfig: { nodeKey: 'start', nodeName: '发起', type: 0, childNode: end() } });

test.beforeEach(() => { store.getState().clear(); store.getState().setProcessModel(model()); });

test('insertion and selection are observed together and the following chain is retained', () => {
  const observations = [];
  const unsubscribe = store.subscribe(state => observations.push([state.processModel.nodeConfig.childNode.nodeKey, state.selectedNodeKey]));
  const published = [];
  store.getState().setExternalOnChange(value => published.push(value));
  observations.length = 0;
  store.getState().insertNode('start', { nodeKey: 'approval', nodeName: '审核', type: 1, childNode: end() });
  unsubscribe();
  assert.deepEqual(observations, [['approval', 'approval']]);
  assert.equal(published.length, 1);
  assert.equal(published[0].nodeConfig.childNode.childNode.nodeKey, 'end');
  store.getState().setProcessModel(JSON.parse(JSON.stringify(published[0])));
  assert.equal(store.getState().selectedNodeKey, 'approval');
});

test('insertion inside a branch preserves sibling branches and selects the new node', () => {
  const value = model();
  value.nodeConfig.childNode = {
    nodeKey: 'branch', nodeName: '条件', type: 4, childNode: end(),
    conditionNodes: [{ nodeKey: 'left', nodeName: '左', type: 3 }, { nodeKey: 'right', nodeName: '右', type: 3 }],
  };
  store.getState().setProcessModel(value);
  store.getState().insertNode('left', { nodeKey: 'nested', nodeName: '审核', type: 1 });
  const state = store.getState();
  assert.equal(state.processModel.nodeConfig.childNode.conditionNodes[0].childNode.nodeKey, 'nested');
  assert.equal(state.processModel.nodeConfig.childNode.conditionNodes[1].childNode, undefined);
  assert.equal(state.processModel.nodeConfig.childNode.childNode.nodeKey, 'end');
  assert.equal(state.selectedNodeKey, 'nested');
});

test('new condition, parallel and inclusive groups select a configurable child', () => {
  for (const [type, field] of [[4, 'conditionNodes'], [8, 'parallelNodes'], [9, 'inclusiveNodes']]) {
    store.getState().setProcessModel(model());
    store.getState().insertNode('start', {
      nodeKey: 'group', nodeName: '分支', type,
      [field]: [{ nodeKey: 'first', nodeName: '第一个分支', type: 3 }], childNode: end(),
    });
    assert.equal(store.getState().selectedNodeKey, 'first');
  }
});

test('read-only or missing parent insertion does not modify the model or emit changes', () => {
  let changes = 0;
  store.getState().setExternalOnChange(() => { changes += 1; });
  const before = store.getState().processModel;
  store.getState().setReadOnly(true);
  store.getState().insertNode('start', { nodeKey: 'blocked', type: 1 });
  store.getState().setReadOnly(false);
  store.getState().insertNode('missing', { nodeKey: 'missing-child', type: 1 });
  assert.equal(store.getState().processModel, before);
  assert.equal(store.getState().selectedNodeKey, undefined);
  assert.equal(changes, 0);
});

const collections = ['conditionNodes', 'parallelNodes', 'inclusiveNodes'];
const approval = (key, childNode) => ({ nodeKey: key, nodeName: key, type: 1, childNode });
function branchModel(field, count = 2, survivor = approval('kept', approval('tail')), continuation = end()) {
  const value = model();
  value.nodeConfig.childNode = {
    nodeKey: 'gateway', nodeName: '分支', type: 4, childNode: continuation,
    [field]: Array.from({ length: count }, (_, index) => ({
      nodeKey: `branch-${index}`, nodeName: `分支${index}`, type: 3, priorityLevel: index + 1,
      childNode: index === count - 1 ? survivor : approval(`removed-${index}`),
    })),
  };
  return value;
}

test('ordinary node deletion traverses every branch kind and preserves its following chain', () => {
  for (const field of [...collections, 'routeNodes']) {
    const value = branchModel(field);
    value.nodeConfig.childNode[field][0].childNode.childNode = approval('next');
    store.getState().setProcessModel(value);
    store.getState().selectNode('removed-0');
    let changes = 0;
    store.getState().setExternalOnChange(() => { changes += 1; });
    store.getState().deleteNode({ nodeKey: 'removed-0' });
    const state = store.getState();
    const gateway = state.processModel.nodeConfig.childNode;
    assert.equal(gateway[field][0].childNode.nodeKey, 'next');
    assert.equal(gateway[field][1].childNode.nodeKey, 'kept');
    assert.equal(gateway.childNode.nodeKey, 'end');
    assert.equal(state.selectedNodeKey, 'next');
    assert.equal(changes, 1);
  }
});

test('branch removal and collapsed selection are published once with both paths retained', () => {
  for (const field of collections) {
    store.getState().setProcessModel(branchModel(field));
    store.getState().selectNode('removed-0');
    const observations = [];
    let changes = 0;
    store.getState().setExternalOnChange(() => { changes += 1; });
    const unsubscribe = store.subscribe(state => observations.push([state.processModel.nodeConfig.childNode.nodeKey, state.selectedNodeKey]));
    store.getState().removeBranch('gateway', 'branch-0', field);
    unsubscribe();
    const chain = store.getState().processModel.nodeConfig.childNode;
    assert.deepEqual(observations, [['kept', 'kept']]);
    assert.equal(chain.childNode.nodeKey, 'tail');
    assert.equal(chain.childNode.childNode.nodeKey, 'end');
    assert.equal(changes, 1);
  }
});

test('removing one of several branches retains siblings, common continuation and priorities', () => {
  for (const field of collections) {
    store.getState().setProcessModel(branchModel(field, 3));
    store.getState().selectNode('removed-1');
    store.getState().removeBranch('gateway', 'branch-1', field);
    const state = store.getState();
    const gateway = state.processModel.nodeConfig.childNode;
    assert.deepEqual(gateway[field].map(branch => [branch.nodeKey, branch.priorityLevel]), [['branch-0', 1], ['branch-2', 2]]);
    assert.equal(gateway.childNode.nodeKey, 'end');
    assert.equal(state.selectedNodeKey, 'branch-2');
  }
});

test('collapse handles empty and nested surviving paths and preserves valid selection', () => {
  store.getState().setProcessModel(branchModel('conditionNodes', 2, undefined));
  // Explicitly empty the path, since the helper default creates one.
  store.getState().updateNodeProps({ nodeKey: 'branch-1' }, 'childNode', undefined);
  store.getState().selectNode('branch-1');
  store.getState().removeBranch('gateway', 'branch-0', 'conditionNodes');
  assert.equal(store.getState().processModel.nodeConfig.childNode.nodeKey, 'end');
  assert.equal(store.getState().selectedNodeKey, 'end');

  const nested = { nodeKey: 'nested', type: 8, parallelNodes: [{ nodeKey: 'inner', type: 3, childNode: approval('inside') }], childNode: approval('after-nested') };
  store.getState().setProcessModel(branchModel('parallelNodes', 2, nested));
  store.getState().selectNode('inside');
  store.getState().removeBranch('gateway', 'branch-0', 'parallelNodes');
  const surviving = store.getState().processModel.nodeConfig.childNode;
  assert.equal(surviving.parallelNodes[0].childNode.nodeKey, 'inside');
  assert.equal(surviving.childNode.childNode.nodeKey, 'end');
  assert.equal(store.getState().selectedNodeKey, 'inside');
});

test('collapse without common continuation retains the surviving path', () => {
  const value = branchModel('parallelNodes');
  value.nodeConfig.childNode.childNode = undefined;
  store.getState().setProcessModel(value);
  store.getState().removeBranch('gateway', 'branch-0', 'parallelNodes');
  assert.equal(store.getState().processModel.nodeConfig.childNode.childNode.nodeKey, 'tail');
});

test('terminal paths keep the gateway when a common continuation would become unreachable', () => {
  for (const type of [-1, 31]) {
    store.getState().setProcessModel(branchModel('parallelNodes', 2, { nodeKey: 'terminal', type }));
    store.getState().removeBranch('gateway', 'branch-0', 'parallelNodes');
    const gateway = store.getState().processModel.nodeConfig.childNode;
    assert.equal(gateway.nodeKey, 'gateway');
    assert.equal(gateway.parallelNodes.length, 1);
    assert.equal(gateway.parallelNodes[0].childNode.childNode, undefined);
    assert.equal(gateway.childNode.nodeKey, 'end');
  }
});

test('invalid, read-only and protected deletions do not publish changes', () => {
  store.getState().setProcessModel(branchModel('conditionNodes'));
  const before = store.getState().processModel;
  let changes = 0;
  store.getState().setExternalOnChange(() => { changes += 1; });
  store.getState().deleteNode({ nodeKey: 'start' });
  store.getState().deleteNode({ nodeKey: 'branch-0' });
  store.getState().deleteNode({ nodeKey: 'missing' });
  store.getState().removeBranch('missing', 'branch-0', 'conditionNodes');
  store.getState().removeBranch('gateway', 'missing', 'conditionNodes');
  store.getState().removeBranch('gateway', 'branch-1', 'conditionNodes');
  store.getState().setReadOnly(true);
  store.getState().deleteNode({ nodeKey: 'removed-0' });
  store.getState().removeBranch('gateway', 'branch-0', 'conditionNodes');
  assert.equal(store.getState().processModel, before);
  assert.equal(changes, 0);

  store.getState().setReadOnly(false);
  store.getState().setProcessModel(branchModel('parallelNodes', 1));
  const single = store.getState().processModel;
  store.getState().removeBranch('gateway', 'branch-0', 'parallelNodes');
  assert.equal(store.getState().processModel, single);
  assert.equal(changes, 0);
});

test('confirmed end insertion removes only the chosen connection subtree in one update', () => {
  store.getState().setProcessModel(branchModel('conditionNodes'));
  store.getState().selectNode('removed-0');
  const observations = [];
  let changes = 0;
  store.getState().setExternalOnChange(() => { changes += 1; });
  const unsubscribe = store.subscribe(state => observations.push(state.selectedNodeKey));
  store.getState().insertNode('branch-0', { nodeKey: 'new-end', nodeName: '结束', type: -1 });
  unsubscribe();
  const gateway = store.getState().processModel.nodeConfig.childNode;
  assert.equal(gateway.conditionNodes[0].childNode.nodeKey, 'new-end');
  assert.equal(gateway.conditionNodes[0].childNode.childNode, undefined);
  assert.equal(gateway.conditionNodes[1].childNode.nodeKey, 'kept');
  assert.equal(gateway.childNode.nodeKey, 'end');
  assert.deepEqual(observations, ['new-end']);
  assert.equal(changes, 1);
});

test('adding a condition or inclusive branch keeps the existing default and its path at the end', () => {
  for (const field of ['conditionNodes', 'inclusiveNodes']) {
    store.getState().setProcessModel(branchModel(field));
    const fallbackBefore = store.getState().processModel.nodeConfig.childNode[field][1];
    let changes = 0;
    store.getState().setExternalOnChange(() => { changes += 1; });
    const observations = [];
    const unsubscribe = store.subscribe(state => observations.push(state.selectedNodeKey));
    store.getState().addBranch('gateway', { nodeKey: 'new-condition', nodeName: '新条件', type: 3, conditionList: [] }, field);
    unsubscribe();
    const gateway = store.getState().processModel.nodeConfig.childNode;
    assert.deepEqual(gateway[field].map(branch => branch.nodeKey), ['branch-0', 'new-condition', 'branch-1']);
    assert.deepEqual(gateway[field].map(branch => branch.priorityLevel), [1, 2, 3]);
    assert.equal(gateway[field][2].childNode, fallbackBefore.childNode);
    assert.equal(gateway.childNode.nodeKey, 'end');
    assert.deepEqual(observations, ['new-condition']);
    assert.equal(changes, 1);
  }
});

test('adding a branch to a missing, empty or read-only gateway leaves the model unchanged', () => {
  store.getState().setProcessModel(branchModel('conditionNodes'));
  const before = store.getState().processModel;
  let changes = 0;
  store.getState().setExternalOnChange(() => { changes += 1; });
  const branch = { nodeKey: 'new-condition', type: 3, conditionList: [] };
  store.getState().addBranch('missing', branch, 'conditionNodes');
  store.getState().addBranch('gateway', branch, 'inclusiveNodes');
  store.getState().setReadOnly(true);
  store.getState().addBranch('gateway', branch, 'conditionNodes');
  assert.equal(store.getState().processModel, before);
  assert.equal(changes, 0);
});

test('deleting a sibling does not silently discard conditions on a legacy final branch', () => {
  for (const field of ['conditionNodes', 'inclusiveNodes']) {
    const value = branchModel(field);
    const conditions = [[{ field: 'amount', operator: '>', value: '100' }]];
    value.nodeConfig.childNode[field][1].conditionList = conditions;
    store.getState().setProcessModel(value);
    store.getState().removeBranch('gateway', 'branch-0', field);
    const gateway = store.getState().processModel.nodeConfig.childNode;
    assert.equal(gateway.nodeKey, 'gateway');
    assert.deepEqual(gateway[field][0].conditionList, conditions);
    assert.equal(gateway[field][0].childNode.nodeKey, 'kept');
    assert.equal(gateway.childNode.nodeKey, 'end');
  }
});
