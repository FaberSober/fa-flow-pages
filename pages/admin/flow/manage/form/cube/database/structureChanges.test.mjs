import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./structureChanges.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { getStructureChanges, getMissingStructureBindings } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('结构差异区分新增、移除和属性变化，排序不算差异', () => {
  const saved = [{ field: 'name', dataType: 'varchar', length: 100, sort: 0 }, { field: 'removed', dataType: 'int' }];
  const current = [{ field: 'added', dataType: 'int' }, { field: 'name', dataType: 'varchar', length: 200, sort: 1 }];
  assert.deepEqual(getStructureChanges(current, saved), { added: ['added'], removed: ['removed'], changed: ['name'] });
  assert.deepEqual(getStructureChanges([{ ...saved[0], sort: 5, scale: null }], [{ ...saved[0], scale: undefined }]), { added: [], removed: [], changed: [] });
  assert.equal(saved[0].length, 100);
});

test('主子表引用按各自表定位，列表虚拟字段不误报', () => {
  const form = {
    dataConfig: { main: { tableName: 'ff_order' } },
    config: { items: [
      { type: 'container_row', children: [{ type: 'input', name: 'old_name', label: '客户名称' }] },
      { type: 'deco_text', name: 'decoration' },
      { type: 'high_subtable', name: 'goods', subtable_tableName: 'ff_goods', children: [{ type: 'input', name: 'old_goods', label: '商品名称' }] },
    ] },
    tableConfig: { query: { columns: [{ field: 'old_name', label: '客户' }] }, table: { columns: [{ field: 'old_name', label: '客户' }, { field: 'current_node_name' }, { field: 'id' }] } },
  };
  const before = structuredClone(form);
  assert.deepEqual(getMissingStructureBindings(form, 'ff_order', [{ field: 'id' }]), ['表单：客户名称（old_name）', '查询：客户（old_name）', '列表：客户（old_name）']);
  assert.deepEqual(getMissingStructureBindings(form, 'ff_goods', [{ field: 'id' }]), ['表单：商品名称（old_goods）']);
  assert.deepEqual(form, before);
});

test('修正绑定后提示消失，旧空配置可以读取', () => {
  assert.deepEqual(getMissingStructureBindings({}, 'ff_order', []), []);
  const form = { dataConfig: { main: { tableName: 'ff_order' } }, config: { items: [{ type: 'input', name: 'name' }] } };
  assert.deepEqual(getMissingStructureBindings(form, 'ff_order', [{ field: 'name' }]), []);
});
