import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Use the project's TypeScript compiler so this test also runs on Node versions without native TS support.
const source = await readFile(new URL('./zoomPanGeometry.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { fitView, zoomAt, constrainView, getMinimap, minimapOffset } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const bounds = { minZoom: 0.1, maxZoom: 4 };
const viewport = { width: 1000, height: 700 };
const content = { width: 1800, height: 1400 };
const mapSize = { width: 200, height: 150 };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('fit uses intrinsic dimensions, centres both axes and is repeatable after zoom/pan', () => {
  const fitted = fitView(viewport, content, bounds);
  assert.ok(content.width * fitted.zoom <= viewport.width - 128);
  assert.ok(content.height * fitted.zoom <= viewport.height - 128);
  close(fitted.offset.x * 2 + content.width * fitted.zoom, viewport.width);
  close(fitted.offset.y * 2 + content.height * fitted.zoom, viewport.height);
  zoomAt(fitted, 3, { x: 200, y: 400 }, bounds);
  assert.deepEqual(fitView(viewport, content, bounds), fitted);
});

test('fit does not enlarge small diagrams and reacts to container resizing', () => {
  assert.equal(fitView(viewport, { width: 220, height: 400 }, bounds).zoom, 1);
  assert.ok(fitView({ width: 500, height: 350 }, content, bounds).zoom < fitView(viewport, content, bounds).zoom);
});

test('zoom keeps the graph point under the pointer fixed and respects zoom limits', () => {
  const before = { zoom: 0.8, offset: { x: -250, y: -180 } };
  const anchor = { x: 320, y: 260 };
  for (const target of [0.5, 2, 10, -10]) {
    const after = zoomAt(before, target, anchor, bounds);
    close((anchor.x - before.offset.x) / before.zoom, (anchor.x - after.offset.x) / after.zoom);
    close((anchor.y - before.offset.y) / before.zoom, (anchor.y - after.offset.y) / after.zoom);
    assert.ok(after.zoom >= bounds.minZoom && after.zoom <= bounds.maxZoom);
  }
});

test('zoom at a reached limit does not move the canvas', () => {
  const before = { zoom: 4, offset: { x: -120, y: 30 } };
  assert.deepEqual(zoomAt(before, 5, { x: 450, y: 200 }, bounds), before);
});

test('pan bounds keep graph reachable at all four edges', () => {
  for (const x of [-1e6, 1e6])
    for (const y of [-1e6, 1e6]) {
      const view = constrainView({ zoom: 2, offset: { x, y } }, viewport, content);
      const cx = (viewport.width / 2 - view.offset.x) / view.zoom;
      const cy = (viewport.height / 2 - view.offset.y) / view.zoom;
      assert.ok(cx >= 0 && cx <= content.width);
      assert.ok(cy >= 0 && cy <= content.height);
    }
});

test('minimap viewport remains within map at fit, minimum/maximum zoom and every pan edge', () => {
  for (const zoom of [0.1, 0.4, 1, 4])
    for (const x of [-1e6, 0, 1e6])
      for (const y of [-1e6, 0, 1e6]) {
        const view = constrainView({ zoom, offset: { x, y } }, viewport, content);
        const { viewport: rect } = getMinimap(view, viewport, content, mapSize);
        assert.ok(rect.x >= -1e-8 && rect.y >= -1e-8);
        assert.ok(rect.x + rect.width <= mapSize.width + 1e-8);
        assert.ok(rect.y + rect.height <= mapSize.height + 1e-8);
      }
});

test('minimap drag and click map back to the same main-canvas coordinates', () => {
  const view = { zoom: 1.2, offset: { x: -200, y: -300 } };
  const map = getMinimap(view, viewport, content, mapSize);
  const grab = { x: 7, y: 11 };
  const originalPoint = { x: map.viewport.x + grab.x, y: map.viewport.y + grab.y };
  const unchanged = minimapOffset(originalPoint, grab, map, view.zoom);
  close(unchanged.x, view.offset.x);
  close(unchanged.y, view.offset.y);
  const moved = minimapOffset({ x: originalPoint.x + 10, y: originalPoint.y + 5 }, grab, map, view.zoom);
  close(moved.x, view.offset.x - (10 / map.scale) * view.zoom);
  close(moved.y, view.offset.y - (5 / map.scale) * view.zoom);
  const centreGrab = { x: map.viewport.width / 2, y: map.viewport.height / 2 };
  const centred = minimapOffset(
    { x: map.origin.x + (content.width / 2) * map.scale, y: map.origin.y + (content.height / 2) * map.scale },
    centreGrab,
    map,
    view.zoom,
  );
  close(centred.x, (viewport.width - content.width * view.zoom) / 2);
  close(centred.y, (viewport.height - content.height * view.zoom) / 2);
});

test('empty content and zero/small containers never create NaN or Infinity', () => {
  for (const viewport of [
    { width: 0, height: 0 },
    { width: 50, height: 30 },
  ]) {
    const empty = { width: 0, height: 0 };
    const view = fitView(viewport, empty, bounds);
    const map = getMinimap(view, viewport, empty, mapSize);
    for (const number of [view.zoom, view.offset.x, view.offset.y, map.scale, ...Object.values(map.viewport)]) assert.ok(Number.isFinite(number));
  }
});
