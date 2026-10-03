import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./numberProperties.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { getNumberInputProps } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('old and cleared configurations preserve unrestricted numeric input', () => {
  const expected = { min: undefined, max: undefined, precision: undefined, step: 1 };
  assert.deepEqual(getNumberInputProps({}), expected);
  assert.deepEqual(getNumberInputProps({ numberMin: null, numberMax: null, numberPrecision: null, numberStep: null }), expected);
});

test('quantity and price settings preserve zero bounds and zero precision', () => {
  assert.deepEqual(getNumberInputProps({ numberMin: 1, numberMax: 100, numberPrecision: 0, numberStep: 1 }),
    { min: 1, max: 100, precision: 0, step: 1 });
  assert.deepEqual(getNumberInputProps({ numberMin: 0, numberPrecision: 2, numberStep: 0.01 }),
    { min: 0, max: undefined, precision: 2, step: 0.01 });
});

test('an inverted range does not pass conflicting limits to numeric input', () => {
  assert.equal(getNumberInputProps({ numberMin: 10, numberMax: 1 }).max, undefined);
  assert.equal(getNumberInputProps({ numberMin: 10, numberMax: 10 }).max, 10);
});
