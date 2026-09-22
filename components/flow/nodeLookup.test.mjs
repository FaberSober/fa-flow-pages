import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./nodeLookup.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { findNodeContextByKey } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const model = {
  nodeKey: 'start',
  type: 0,
  childNode: { nodeKey: 'approval', type: 1 },
  conditionNodes: [{ nodeKey: 'condition-branch', type: 3, childNode: { nodeKey: 'condition-child', type: 1 } }],
  parallelNodes: [{ nodeKey: 'parallel-branch', type: 8 }],
  inclusiveNodes: [{ nodeKey: 'inclusive-branch', type: 9 }],
  routeNodes: [{ nodeKey: 'route-target', type: 22 }],
};

test('returns the owner and branch kind for branch nodes', () => {
  assert.equal(findNodeContextByKey(model, 'condition-branch').branchKind, 'condition');
  assert.equal(findNodeContextByKey(model, 'condition-branch').parentNode.nodeKey, 'start');
  assert.equal(findNodeContextByKey(model, 'parallel-branch').branchKind, 'parallel');
  assert.equal(findNodeContextByKey(model, 'inclusive-branch').branchKind, 'inclusive');
  assert.equal(findNodeContextByKey(model, 'route-target').branchKind, 'route');
});

test('keeps linear and nested child lookup working', () => {
  assert.equal(findNodeContextByKey(model, 'approval').parentNode.nodeKey, 'start');
  assert.equal(findNodeContextByKey(model, 'condition-child').parentNode.nodeKey, 'condition-branch');
  assert.equal(findNodeContextByKey(model, 'missing'), undefined);
});
