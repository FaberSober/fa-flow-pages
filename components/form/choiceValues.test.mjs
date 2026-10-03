import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./choiceValues.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { convertChoiceDefault, parseStoredChoiceValues } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('mode switching preserves string and numeric defaults including zero', () => {
  assert.deepEqual(convertChoiceDefault('pending', true), ['pending']);
  assert.deepEqual(convertChoiceDefault(0, true), [0]);
  assert.equal(convertChoiceDefault(['pending', 'paid'], false), 'pending');
  assert.equal(convertChoiceDefault([0, 1], false), 0);
  assert.equal(convertChoiceDefault([], false), undefined);
  assert.deepEqual(convertChoiceDefault(null, true), []);
});

test('stored JSON arrays preserve option types and empty selections', () => {
  assert.deepEqual(parseStoredChoiceValues('["pending", "paid"]'), ['pending', 'paid']);
  assert.deepEqual(parseStoredChoiceValues('[0, 1]'), [0, 1]);
  assert.deepEqual(parseStoredChoiceValues('[]'), []);
  assert.deepEqual(parseStoredChoiceValues('invalid'), []);
  assert.deepEqual(parseStoredChoiceValues('{}'), []);
  assert.deepEqual(parseStoredChoiceValues(null), []);
  const current = ['pending'];
  assert.deepEqual(parseStoredChoiceValues(current), current);
  assert.notEqual(parseStoredChoiceValues(current), current);
});
