import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./form.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { reconcileSelectedColumns } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const create = (column, sort) => ({ ...column, label: column.field, sort });

test('adding a field preserves edited properties and dragged order without mutating input', () => {
  const current = [
    { field: 'order_no', label: '订单号', queryType: 'eq', default: '001', multiple: true, sort: 4 },
    { field: 'customer_name', label: '客户', width: 180, fix: 'left', sorter: true, sort: 7 },
  ];
  const snapshot = structuredClone(current);
  const result = reconcileSelectedColumns(current, [
    { field: 'customer_name' }, { field: 'order_no' }, { field: 'crt_time' },
  ], create);
  assert.deepEqual(result, [
    { ...current[0], sort: 0 }, { ...current[1], sort: 1 },
    { field: 'crt_time', label: 'crt_time', sort: 2 },
  ]);
  assert.deepEqual(current, snapshot);
});

test('removing fields preserves remaining settings and allows clearing or reselecting', () => {
  const current = [{ field: 'order_no', label: '订单号', width: 200, sort: 0 }];
  assert.deepEqual(reconcileSelectedColumns(current, [], create), []);
  assert.deepEqual(reconcileSelectedColumns(current, [{ field: 'order_no' }], create), current);
  assert.deepEqual(reconcileSelectedColumns([], [{ field: 'order_no' }], create), [
    { field: 'order_no', label: 'order_no', sort: 0 },
  ]);
});
