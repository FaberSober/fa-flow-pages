import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./FormItemPropertyPanel.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('FormItemPropertyPanel.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function find(predicate) {
  const matches = [];
  function visit(node) {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return matches;
}

function assertIndependent(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent)) {
      assert.notEqual(parent.openingElement.tagName.getText(file), 'Form.Item', '属性组件不能嵌入其他输入字段的 Form.Item');
    }
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      assert.ok(!parent.left.getText(file).includes("['input', 'textarea', 'inputnumber']"), '其他类型的属性不能被文本默认值条件隐藏');
    }
  }
}

test('date/time and numeric property panels remain outside text default field', () => {
  for (const name of ['FormItemTemporalProperty', 'FormItemNumberProperty']) {
    const nodes = find(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === name);
    assert.equal(nodes.length, 1);
    nodes.forEach(assertIndependent);
  }
});

test('boolean default field remains accessible outside text default field', () => {
  const nodes = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'Form.Item'
    && node.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop)
      && prop.name.getText(file) === 'label' && prop.initializer?.text === '默认选中'));
  assert.equal(nodes.length, 1);
  assertIndependent(nodes[0]);
});
