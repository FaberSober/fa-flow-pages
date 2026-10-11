import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const compile = source => {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
};
// Capture layout commits without a browser; execute the real hook and geometry with a controlled RAF queue.
const react = compile(`
  export const layouts = [], writes = [], effects = [];
  export const useRef = current => ({ current });
  export const useState = initial => [initial, value => writes.push(value)];
  export const useCallback = callback => callback;
  export const useLayoutEffect = callback => layouts.push(callback);
  export const useEffect = callback => effects.push(callback);
`);
const geometry = compile(await readFile(new URL('../utils/zoomPanGeometry.ts', import.meta.url), 'utf8'));
const source = (await readFile(new URL('./useZoomPan.ts', import.meta.url), 'utf8'))
  .replace("'react'", JSON.stringify(react))
  .replace("'../utils/zoomPanGeometry'", JSON.stringify(geometry));
const { default: useZoomPan } = await import(compile(source));
const { layouts, writes, effects } = await import(react);

test('mount, remount and viewport resizing commit fitted coordinates before any animation frame', () => {
  const originals = { requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame, ResizeObserver: globalThis.ResizeObserver };
  const frames = new Map();
  let frameId = 0;
  let resize;
  globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() {}
  };
  try {
    for (let mount = 0; mount < 2; mount++) {
      layouts.length = 0;
      writes.length = 0;
      // biome-ignore lint/correctness/useHookAtTopLevel: The controlled hook harness deliberately simulates separate mounts.
      const controller = useZoomPan();
      const viewport = { clientWidth: 1000, clientHeight: 700 };
      controller.containerRef.current = viewport;
      controller.contentRef.current = { offsetWidth: 200, offsetHeight: 400, querySelector: () => null };
      const cleanup = layouts[0]();
      assert.deepEqual(writes.at(-1), { zoom: 1, offset: { x: 400, y: 150 } });
      assert.equal(frames.size, 0, 'initial positioning must not wait for RAF');

      controller.setZoom(0.8);
      assert.equal(frames.size, 1, 'pointer zoom still batches via RAF');
      viewport.clientWidth = 1200;
      resize();
      assert.deepEqual(writes.at(-1), { zoom: 1, offset: { x: 500, y: 150 } });
      assert.equal(frames.size, 0, 'layout commit cancels stale input frames');

      for (const offset of [{ x: -100000, y: -100000 }, { x: 100000, y: 100000 }]) {
        controller.setOffset(offset);
        for (const callback of frames.values()) callback();
        frames.clear();
        assert.deepEqual(writes.at(-1), { zoom: 1, offset }, 'pan must not clamp distant coordinates');
        controller.setZoom(0.8);
        for (const callback of frames.values()) callback();
        frames.clear();
        const zoomed = writes.at(-1);
        assert.equal(zoomed.zoom, 0.8);
        assert.equal((600 - zoomed.offset.x) / zoomed.zoom, 600 - offset.x, 'zoom retains the distant point under its anchor');
        controller.resetView();
        assert.deepEqual(writes.at(-1), { zoom: 1, offset: { x: 500, y: 150 } }, 'fit recovers a freely panned graph');
      }

      const beforeHidden = writes.length;
      viewport.clientWidth = 0;
      resize();
      assert.equal(writes.length, beforeHidden, 'hidden steps retain their last usable view');
      cleanup();
    }
  } finally {
    for (const [name, original] of Object.entries(originals)) {
      if (original === undefined) delete globalThis[name];
      else globalThis[name] = original;
    }
  }
});

test('left drag pans blank canvas while node and control targets keep their click interactions', () => {
  const names = ['requestAnimationFrame', 'cancelAnimationFrame', 'Element', 'window', 'document'];
  const originals = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  const handlers = new Map();
  const frames = [];
  let captures = 0;
  class Target {
    constructor(selector = '') { this.selector = selector; }
    closest(selectors) { return this.selector && selectors.split(',').some(selector => selector.trim() === this.selector) ? this : null; }
  }
  globalThis.Element = Target;
  globalThis.window = globalThis.document = { addEventListener() {}, removeEventListener() {} };
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  globalThis.cancelAnimationFrame = () => {};
  try {
    effects.length = 0;
    writes.length = 0;
    // biome-ignore lint/correctness/useHookAtTopLevel: This controlled hook harness tests native event handlers without a React renderer.
    const controller = useZoomPan();
    controller.containerRef.current = {
      addEventListener: (name, callback) => handlers.set(name, callback),
      removeEventListener() {}, focus() {},
      setPointerCapture() { captures++; }, hasPointerCapture: () => false,
    };
    const cleanup = effects[0]();
    const event = (target, button = 0) => ({ target, button, pointerId: 1, clientX: 10, clientY: 20, preventDefault() {}, stopPropagation() {} });
    for (const selector of ['.node-wrap-box', '.auto-judge', '.close', '.sort-left', '.sort-right', 'button', 'input', '[role="button"]']) {
      handlers.get('pointerdown')(event(new Target(selector)));
      assert.equal(captures, 0, `left click on ${selector} must not start dragging`);
    }
    handlers.get('pointerdown')(event(new Target(), 2));
    assert.equal(captures, 0, 'right button keeps its usual behavior');
    handlers.get('pointerdown')(event(new Target()));
    assert.equal(captures, 1, 'blank canvas captures left drag without space');
    handlers.get('pointermove')({ pointerId: 1, clientX: 110, clientY: 220 });
    for (const callback of frames.splice(0)) callback();
    assert.deepEqual(writes.at(-1), { zoom: 1, offset: { x: 100, y: 200 } });
    handlers.get('pointerup')();
    let suppressed = false;
    handlers.get('click')({ preventDefault() { suppressed = true; }, stopPropagation() {} });
    assert.equal(suppressed, true, 'drag release must not select a node');
    handlers.get('keydown')({ code: 'Space', target: new Target(), preventDefault() {} });
    handlers.get('pointerdown')(event(new Target('.node-wrap-box')));
    assert.equal(captures, 2, 'space drag remains available over a node');
    handlers.get('pointerup')();
    handlers.get('keyup')({ code: 'Space' });
    handlers.get('pointerdown')(event(new Target('.node-wrap-box'), 1));
    assert.equal(captures, 3, 'middle button drag remains available');
    cleanup();
  } finally {
    for (const [name, original] of Object.entries(originals)) {
      if (original === undefined) delete globalThis[name];
      else globalThis[name] = original;
    }
  }
});
