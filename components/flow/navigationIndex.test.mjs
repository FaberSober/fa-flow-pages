import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function moduleUrl(file, replacements = {}) {
  let source = await readFile(new URL(file, import.meta.url), 'utf8');
  for (const [from, to] of Object.entries(replacements)) source = source.replace(from, to);
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } });
  return 'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64');
}
const enums = await moduleUrl('../../types/FlwEnums.ts');
const semantics = await moduleUrl('./branchSemantics.ts');
const { buildNavigationIndex, searchNavigation } = await import(await moduleUrl('./navigationIndex.ts', { '../../types/FlwEnums': enums, './branchSemantics': semantics }));
const node = (nodeKey, nodeName, type = 1, rest = {}) => ({ nodeKey, nodeName, type, ...rest });

test('nested branches follow visual order with unique paths and one merged successor', () => {
  const root = node('start', '发起人', 0, { childNode: node('gateway', '条件分支', 4, {
    conditionNodes: [
      node('first', '条件1', 3, { conditionList: [[{ field: 'amount' }]], childNode: node('approve1', '审核') }),
      node('fallback', '条件2', 3, { conditionList: [], childNode: node('parallel', '并行分支', 8, {
        parallelNodes: [node('branch1', '分支1', 8, { childNode: node('approve2', '审核') }), node('branch2', '分支2', 8)],
      }) }),
    ], childNode: node('end', '结束', -1),
  }) });
  const index = buildNavigationIndex(root);
  assert.deepEqual(index.map(item => item.key), ['start', 'first', 'approve1', 'fallback', 'branch1', 'approve2', 'branch2', 'end']);
  assert.equal(index.find(item => item.key === 'fallback').name, '默认分支');
  assert.equal(index.find(item => item.key === 'approve2').path, '主流程 / 条件分支 / 默认分支 / 并行分支 / 分支1');
  assert.equal(index.find(item => item.key === 'end').path, '主流程');
  assert.equal(searchNavigation(index, '审核').length, 2);
});
test('only the last empty conditional or inclusive branch is default; parallel names remain', () => {
  const index = buildNavigationIndex(node('group', '包容分支', 9, { inclusiveNodes: [node('a', '包容1', 3), node('b', '包容2', 3)] }));
  assert.deepEqual(index.map(item => item.name), ['包容1', '默认分支']);
});
test('name, type and key searches trim query and ignore case; route references are not extra destinations', () => {
  const root = node('RouteABC', '选择路径', 23, { routeNodes: [node('route:missing', '引用', 3)] });
  const index = buildNavigationIndex(root);
  assert.equal(index.length, 1);
  for (const query of [' 路由 ', '选择', 'routeabc']) assert.equal(searchNavigation(index, query).length, 1);
  for (const query of ['', '   ', 'missing']) assert.deepEqual(searchNavigation(index, query), []);
});
test('rebuilding reflects rename and deletion, and handles missing or cyclic models safely', () => {
  assert.deepEqual(buildNavigationIndex(), []);
  const root = node('a', '原名称');
  const old = buildNavigationIndex(root);
  root.nodeName = '新名称';
  root.childNode = root;
  const next = buildNavigationIndex(root);
  assert.equal(next.length, 1);
  assert.equal(searchNavigation(old, '原名称').length, 1);
  assert.equal(searchNavigation(next, '原名称').length, 0);
  assert.equal(searchNavigation(next, '新名称').length, 1);
  root.childNode = node('b', '待删除');
  assert.equal(buildNavigationIndex(root).length, 2);
  delete root.childNode;
  assert.equal(searchNavigation(buildNavigationIndex(root), '待删除').length, 0);
});
