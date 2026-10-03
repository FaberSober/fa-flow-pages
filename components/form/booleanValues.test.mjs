import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./booleanValues.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { toBooleanFormValue } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('MySQL and PostgreSQL true values render checked', () => {
  for (const value of [true, 1, '1', 'true', 'TRUE', 't']) assert.equal(toBooleanFormValue(value), true);
});

test('false strings, empty and absent defaults do not render checked', () => {
  for (const value of [false, 0, '0', 'false', 'FALSE', 'f', '', null, undefined, 'unknown'])
    assert.equal(toBooleanFormValue(value), false);
});
