import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./textProperties.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { getTextInputProps, getTextAreaRows } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('old and cleared text configurations retain unrestricted input and original row counts', () => {
  assert.deepEqual(getTextInputProps({}), { maxLength: undefined, showCount: false });
  assert.deepEqual(getTextInputProps({ textMaxLength: null }), { maxLength: undefined, showCount: false });
  assert.equal(getTextAreaRows({}, 4), 4);
  assert.equal(getTextAreaRows({ textRows: null }, 2), 2);
});

test('configured text length and rows apply without changing saved content', () => {
  const item = { textMaxLength: 20, textRows: 6, initialValue: 'existing content' };
  assert.deepEqual(getTextInputProps(item), { maxLength: 20, showCount: true });
  assert.equal(getTextAreaRows(item, 2), 6);
  assert.equal(getTextAreaRows({ textRows: 100 }, 4), 12);
  assert.equal(item.initialValue, 'existing content');
});
