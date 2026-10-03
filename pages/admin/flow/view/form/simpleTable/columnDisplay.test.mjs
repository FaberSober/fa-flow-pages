import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

function compile(source) {
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
}
const booleanSource = await readFile(new URL('../../../../../../components/form/booleanValues.ts', import.meta.url), 'utf8');
const booleanUrl = `data:text/javascript;base64,${Buffer.from(compile(booleanSource)).toString('base64')}`;
const source = await readFile(new URL('./columnDisplay.ts', import.meta.url), 'utf8');
const resolved = compile(source).replace('@features/fa-flow-pages/components/form/booleanValues', booleanUrl);
const { getMainFormFieldMap, formatFormColumnValue } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);

const options = [{ label: '待付款', value: 'pending' }, { label: '已付款', value: 'paid' }, { label: '零', value: 0 }];
test('choice labels preserve numeric matches and unknown historical values', () => {
  const item = { type: 'radio', options };
  assert.equal(formatFormColumnValue(item, 'pending'), '待付款');
  assert.equal(formatFormColumnValue(item, '0'), '零');
  assert.equal(formatFormColumnValue(item, 'old'), 'old');
  assert.equal(formatFormColumnValue(item, null), '—');
});

test('multiple choice JSON and boolean values render readable text', () => {
  const item = { type: 'select', mode: 'multiple', options };
  assert.equal(formatFormColumnValue(item, '["pending","paid"]'), '待付款、已付款');
  assert.equal(formatFormColumnValue(item, [0, 'old']), '零、old');
  assert.equal(formatFormColumnValue(item, '[]'), '—');
  assert.equal(formatFormColumnValue(item, 'invalid'), 'invalid');
  assert.equal(formatFormColumnValue({ type: 'switch' }, '0'), '否');
  assert.equal(formatFormColumnValue({ type: 'checkbox' }, true), '是');
});

test('main field lookup traverses containers and excludes subtable fields', () => {
  const main = { type: 'select', name: 'status', options };
  const map = getMainFormFieldMap([
    { type: 'container_row', children: [main] },
    { type: 'high_subtable', name: 'goods', children: [{ type: 'radio', name: 'status', options: [] }] },
  ]);
  assert.equal(map.get('status'), main);
  assert.equal(map.has('goods'), false);
});
