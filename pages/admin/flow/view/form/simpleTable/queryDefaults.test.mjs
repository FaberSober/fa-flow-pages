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


test('数值区间保留空端、零值和重复边界，不按多值去重', () => {
  assert.deepEqual(getDefaultQueryValues([
    { field: 'amount', queryType: 'number_range', multiple: true, default: '0,0' },
    { field: 'count', queryType: 'number_range', default: ',10' },
    { field: 'price', queryType: 'number_range', default: '1.25，' },
  ]), { amount: ['0', '0'], count: ['', '10'], price: ['1.25', ''] });
});


test('日期区间默认值保留单侧与同日边界，不按多值拆分去重', () => {
  assert.deepEqual(getDefaultQueryValues([
    { field: 'crt_time', queryType: 'date_range', multiple: true, default: '2026-10-01,2026-10-01' },
    { field: 'order_date', queryType: 'date_range', default: ',2026-10-03' },
    { field: 'delivery_date', queryType: 'date_range', default: '2026-10-01，' },
  ]), { crt_time: ['2026-10-01', '2026-10-01'], order_date: ['', '2026-10-03'], delivery_date: ['2026-10-01', ''] });
});
