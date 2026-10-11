import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('./flowLeaveGuard.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } });
const { protectFlowUnload } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
function leaving(target) {
  const event = new Event('beforeunload', { cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

test('unload protection reads latest dirty or request state without registering again', () => {
  const target = new EventTarget();
  let dirty = false;
  let busy = false;
  const cleanup = protectFlowUnload(target, () => dirty || busy);
  assert.equal(leaving(target), false);
  dirty = true;
  assert.equal(leaving(target), true);
  dirty = false;
  assert.equal(leaving(target), false);
  busy = true;
  assert.equal(leaving(target), true);
  busy = false;
  assert.equal(leaving(target), false);
  cleanup();
});

test('closing or unmounting an editor removes its unload protection', () => {
  const target = new EventTarget();
  const cleanup = protectFlowUnload(target, () => true);
  assert.equal(leaving(target), true);
  cleanup();
  assert.equal(leaving(target), false);
  cleanup();
  assert.equal(leaving(target), false);
});

test('cleanup of one editor preserves another active editor protection', () => {
  const target = new EventTarget();
  const first = protectFlowUnload(target, () => true);
  const second = protectFlowUnload(target, () => true);
  first();
  assert.equal(leaving(target), true);
  second();
  assert.equal(leaving(target), false);
});
