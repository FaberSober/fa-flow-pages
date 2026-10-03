import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./subtableRows.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { copySubtableRow } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('已保存行复制为新记录，不携带标识、系统字段或未配置字段', () => {
  const original = { id: 10, _key: 'old', goods_name: '商品', goods_num: 0, enabled: false, tenant_id: 'tenant', deleted: false, crt_user: 'admin', hidden: '私有值' };
  const children = ['id', '_key', 'goods_name', 'goods_num', 'enabled', 'tenant_id', 'deleted', 'crt_user'].map(name => ({ id: name, name }));
  assert.deepEqual(copySubtableRow(original, children, 'new', ['tenant_id', 'deleted', 'crt_user']),
    { _key: 'new', goods_name: '商品', goods_num: 0, enabled: false });
  assert.equal(original.id, 10);
  assert.equal(original._key, 'old');
});

test('复制多选等复合值后，修改副本不影响原行', () => {
  const original = { tags: ['a'], detail: { values: [1] }, empty: null };
  const children = ['tags', 'detail', 'empty', 'unset'].map(name => ({ id: name, name }));
  const copy = copySubtableRow(original, children, 'copy', []);
  copy.tags.push('b');
  copy.detail.values[0] = 2;
  assert.deepEqual(original, { tags: ['a'], detail: { values: [1] }, empty: null });
  assert.equal(copy.empty, null);
  assert.equal(copy.unset, undefined);
});
