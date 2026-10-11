import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('./flowLeaveScope.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } });
const { createFlowLeaveScope } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

test('cancelled editor confirmation preserves parent and other guards', async () => {
  const scope = createFlowLeaveScope();
  let allow = false;
  const calls = [];
  scope.register(async () => { calls.push('flow'); return allow; });
  scope.register(async () => { calls.push('second'); return true; });
  await scope.run(() => { calls.push('leave'); });
  assert.deepEqual(calls, ['flow']);
  allow = true;
  await scope.run(() => { calls.push('leave'); });
  assert.deepEqual(calls, ['flow', 'flow', 'second', 'leave']);
});

test('pending confirmation or parent action ignores repeated navigation', async () => {
  const scope = createFlowLeaveScope();
  let approve;
  let finish;
  let confirmations = 0;
  let actions = 0;
  scope.register(() => { confirmations++; return new Promise(resolve => { approve = resolve; }); });
  const first = scope.run(() => { actions++; return new Promise(resolve => { finish = resolve; }); });
  await scope.run(() => { actions++; });
  assert.equal(confirmations, 1);
  approve(true);
  await Promise.resolve();
  await scope.run(() => { actions++; });
  assert.equal(actions, 1);
  finish();
  await first;
});

test('unmounted editor unregisters its guard without removing other editor', async () => {
  const scope = createFlowLeaveScope();
  let actions = 0;
  const unregister = scope.register(async () => false);
  const second = scope.register(async () => false);
  unregister();
  await scope.run(() => { actions++; });
  assert.equal(actions, 0);
  second();
  await scope.run(() => { actions++; });
  assert.equal(actions, 1);
});

test('failed parent action releases lock for the next leave request', async () => {
  const scope = createFlowLeaveScope();
  await assert.rejects(scope.run(async () => { throw new Error('failed'); }));
  let left = false;
  await scope.run(() => { left = true; });
  assert.equal(left, true);
});
