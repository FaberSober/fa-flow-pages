import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('./flowRefresh.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } });
const { commitFlowRefresh } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

test('cancelled refresh confirmation preserves the current editable model', async () => {
  let model = 'unsaved';
  assert.equal(await commitFlowRefresh(() => true, async () => {}, () => { model = 'server'; }), false);
  assert.equal(model, 'unsaved');
});

test('newer request during confirmation prevents an older response replacing content', async () => {
  let current = 1;
  let model = 'unsaved';
  let approve;
  const pending = commitFlowRefresh(() => current === 1, async action => { await new Promise(resolve => { approve = resolve; }); action(); }, () => { model = 'old server'; });
  current = 2;
  approve();
  assert.equal(await pending, false);
  assert.equal(model, 'unsaved');
  assert.equal(await commitFlowRefresh(() => current === 2, async action => action(), () => { model = 'latest server'; }), true);
  assert.equal(model, 'latest server');
});

test('unmounted or stale response never opens a confirmation', async () => {
  let prompted = false;
  let applied = false;
  assert.equal(await commitFlowRefresh(() => false, async action => { prompted = true; action(); }, () => { applied = true; }), false);
  assert.equal(prompted, false);
  assert.equal(applied, false);
});
