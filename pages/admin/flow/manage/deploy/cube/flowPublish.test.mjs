import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const { outputText } = ts.transpileModule(await readFile(new URL('./flowPublish.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } });
const { publishFlow, FlowPublishError } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

test('deployment follows successful save and baseline update', async () => {
  const events = [];
  const result = await publishFlow({ needsSave: true, save: async () => events.push('save'), onSaved: () => events.push('saved'), deploy: async () => { events.push('deploy'); return 'ok'; }, onStage: stage => events.push(stage) });
  assert.equal(result, 'ok');
  assert.deepEqual(events, ['saving', 'save', 'saved', 'deploying', 'deploy']);
});

test('save failure does not deploy or update the saved baseline', async () => {
  let saved = false;
  let deployed = false;
  await assert.rejects(publishFlow({ needsSave: true, save: async () => { throw new Error('offline'); }, onSaved: () => { saved = true; }, deploy: async () => { deployed = true; }, onStage: () => {} }), error => error instanceof FlowPublishError && error.stage === 'saving');
  assert.equal(saved, false);
  assert.equal(deployed, false);
});

test('failed deployment retains saved baseline and retry skips duplicate save', async () => {
  let saved = false;
  let saves = 0;
  let deploys = 0;
  const callbacks = { save: async () => { saves++; }, onSaved: () => { saved = true; }, deploy: async () => { if (++deploys === 1) throw new Error('engine unavailable'); return 'ok'; }, onStage: () => {} };
  await assert.rejects(publishFlow({ ...callbacks, needsSave: !saved }), error => error.stage === 'deploying');
  assert.equal(saved, true);
  assert.equal(await publishFlow({ ...callbacks, needsSave: !saved }), 'ok');
  assert.equal(saves, 1);
  assert.equal(deploys, 2);
});

test('edits after failure require another save before deployment', async () => {
  let baseline = 'old';
  let value = 'first';
  const events = [];
  const callbacks = { save: async () => { events.push(`save:${value}`); }, onSaved: () => { baseline = value; }, deploy: async () => { events.push(`deploy:${value}`); throw new Error('failed'); }, onStage: () => {} };
  await assert.rejects(publishFlow({ ...callbacks, needsSave: value !== baseline }));
  value = 'new';
  await assert.rejects(publishFlow({ ...callbacks, needsSave: value !== baseline }));
  assert.deepEqual(events, ['save:first', 'deploy:first', 'save:new', 'deploy:new']);
});
