import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./linkDrafts.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { getLinkEditableValues, hasLinkChanges, mergeLinkDrafts } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
const row = { id: 1, sort: 0, remark: '订单商品', foreignKey: 'order_id', referenceKey: 'id', dataConfig: { version: 1 } };

test('行更新只发送关联属性，结构配置不随旧快照覆盖', () => {
  assert.deepEqual(getLinkEditableValues(row), { sort: 0, remark: '订单商品', foreignKey: 'order_id', referenceKey: 'id' });
  assert.equal(hasLinkChanges({ ...row }, row), false);
  for (const [key, value] of Object.entries({ sort: 2, remark: '商品明细', foreignKey: 'parent_id', referenceKey: 'order_id' })) {
    assert.equal(hasLinkChanges({ ...row, [key]: value }, row), true);
  }
});

test('刷新保留其他行草稿并采用最新结构，删除行不会复活', () => {
  const draft = { ...row, sort: 2, remark: '商品明细' };
  const server = { ...row, dataConfig: { version: 2 } };
  const added = { ...row, id: 3 };
  const result = mergeLinkDrafts([server, added], [row, { ...row, id: 2 }], [draft, { ...row, id: 2, remark: '已删除' }]);
  assert.deepEqual(result, [{ ...server, sort: 2, remark: '商品明细' }, added]);
  assert.equal(server.sort, 0);
  assert.equal(draft.dataConfig.version, 1);
});

test('已提交的行接受后台最新值', () => {
  const saved = { ...row, sort: 2 };
  const server = { ...saved, remark: '后台备注' };
  assert.deepEqual(mergeLinkDrafts([server], [saved], [{ ...saved }]), [server]);
});
