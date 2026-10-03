import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./numberDisplay.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { formatNumberColumnValue: format, isNumericColumn } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('金额显示保持十进制精度，四舍五入及进位正确', () => {
  assert.equal(format('1.005', 2), '1.01');
  assert.equal(format('9.999', 2), '10.00');
  assert.equal(format('-1.005', 2), '-1.01');
  assert.equal(format('-0.004', 2), '0.00');
  assert.equal(format('9007199254740993.125', 2), '9007199254740993.13');
  assert.equal(format(0, 2), '0.00');
  assert.equal(format('2.5', 0), '3');
});

test('浮点科学计数、清空和历史异常值显示兼容', () => {
  assert.equal(format(1e-7, 8), '0.00000010');
  assert.equal(format('1.234E2', 2), '123.40');
  assert.equal(format(null, 2), '—');
  assert.equal(format('old', 2), 'old');
  assert.equal(format('2.5', -1), '2.5');
  assert.equal(format('2.5', 1.5), '2.5');
  assert.equal(isNumericColumn('numeric'), true);
  assert.equal(isNumericColumn('varchar'), false);
});
