import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('./flowSaveSnapshot.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { flowSavePayload, flowSaveSnapshot } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

test('save payload excludes engine deployment and audit fields', () => {
  const payload = flowSavePayload({ id: 1, processName: '流程', modelContent: '{}', processId: 999, processVersion: 5, updateTime: 'now' });
  assert.equal(payload.id, 1);
  assert.equal(payload.modelContent, '{}');
  assert.equal(payload.submitterPermission, false);
  assert.equal('processId' in payload, false);
  assert.equal('processVersion' in payload, false);
  assert.equal('updateTime' in payload, false);
});
test('snapshot ignores field order and deployment metadata but detects editable changes', () => {
  const saved = { id: 1, processName: '原名', modelContent: '{}', processState: 1 };
  assert.equal(flowSaveSnapshot(saved), flowSaveSnapshot({ modelContent: '{}', processState: 1, processName: '原名', id: 1, processVersion: 3, submitterPermission: false }));
  for (const change of [{ processName: '新名' }, { modelContent: '{"nodeConfig":{}}' }, { submitterPermission: true }, { processState: 0 }]) {
    assert.notEqual(flowSaveSnapshot(saved), flowSaveSnapshot({ ...saved, ...change }));
  }
});
test('edits while saving remain dirty against the successful request snapshot', () => {
  const requested = { id: 1, processName: '提交值', modelContent: '{}' };
  const baseline = flowSaveSnapshot(requested);
  const current = { ...requested, processName: '请求期间的新值' };
  assert.notEqual(flowSaveSnapshot(current), baseline);
  assert.equal(requested.processName, '提交值');
});
