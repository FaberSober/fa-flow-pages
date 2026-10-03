import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./queryDefaults.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { getDefaultQueryValues } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('configured query defaults include zero and omit empty conditions', () => {
  const columns = [{ field: 'order_no', default: 'ORDER001' }, { field: 'status', default: '0' },
    { field: 'empty', default: '' }, { field: 'blank', default: '  ' }, { field: 'absent' }];
  assert.deepEqual(getDefaultQueryValues(columns), { order_no: 'ORDER001', status: '0' });
  assert.deepEqual(getDefaultQueryValues(), {});
  assert.equal(columns[0].default, 'ORDER001');
});


test('multiple defaults split both comma styles and preserve single defaults', () => {
  assert.deepEqual(getDefaultQueryValues([
    { field: 'order_no', queryType: 'in', default: 'A, B，A' },
    { field: 'customer_name', multiple: true, default: '张，李' },
    { field: 'status', queryType: 'eq', default: '0' },
  ]), { order_no: ['A', 'B'], customer_name: ['张', '李'], status: '0' });
});
