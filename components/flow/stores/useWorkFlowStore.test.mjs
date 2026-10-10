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
