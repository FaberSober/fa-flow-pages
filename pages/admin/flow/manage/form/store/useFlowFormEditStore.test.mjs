import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = await readFile(new URL('./useFlowFormEditStore.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputText)((name) => {
  if (name.startsWith('@/services')) throw new Error('编辑草稿不能请求后台');
  return require(name);
}, module, module.exports);
const store = module.exports.useFlowFormEditStore;

function form() {
  return { id: 1, config: { items: [] }, tableConfig: {
    query: { columns: [{ field: 'order_no', label: '订单', queryType: 'like' }] },
    table: { columns: [{ field: 'order_no', label: '订单', width: 100 }], detail: { type: 'normal' } },
  } };
}

test('query and table attribute edits only update local draft without mutating loaded values', () => {
  const loaded = form();
  const original = structuredClone(loaded);
  store.getState().setFlowForm(loaded);
  store.getState().updateFlowFormTableConfigQueryColumn({ ...loaded.tableConfig.query.columns[0], queryType: 'eq' });
  store.getState().updateFlowFormTableConfigTableColumn({ ...loaded.tableConfig.table.columns[0], width: 200 });
  store.getState().updateFlowFormTableConfigTableDetail({ type: 'editTable' });
  const draft = store.getState().flowForm;
  assert.equal(draft.tableConfig.query.columns[0].queryType, 'eq');
  assert.equal(draft.tableConfig.table.columns[0].width, 200);
  assert.equal(draft.tableConfig.table.detail.type, 'editTable');
  assert.deepEqual(loaded, original);
});

test('discard clears the draft and reopening restores saved configuration', () => {
  const loaded = form();
  store.getState().setFlowForm(loaded);
  store.getState().updateFlowFormTableConfig({ ...loaded, tableConfig: { ...loaded.tableConfig, query: { columns: [] } } });
  assert.equal(store.getState().flowForm.tableConfig.query.columns.length, 0);
  store.getState().clear();
  assert.equal(store.getState().flowForm, null);
  store.getState().setFlowForm(loaded);
  assert.equal(store.getState().flowForm.tableConfig.query.columns.length, 1);
  store.getState().clear();
});
