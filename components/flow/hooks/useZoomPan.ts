import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { constrainView, fitView, zoomAt, type Point, type Size, type View } from '../utils/zoomPanGeometry';

export interface ZoomPanOptions {
  minZoom?: number;
  maxZoom?: number;
  step?: number;
}

const isEditable = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]');
const isControl = (target: EventTarget | null) => isEditable(target) || (target instanceof Element && !!target.closest('button, a, [role="button"]'));

export default function useZoomPan({ minZoom = 0.1, maxZoom = 4, step = 0.1 }: ZoomPanOptions = {}) {
  const containerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ zoom: 1, offset: { x: 0, y: 0 } });
  const viewRef = useRef(view);
  const pendingFrame = useRef(0);
  const dimensionsRef = useRef({ viewport: { width: 0, height: 0 }, content: { width: 0, height: 0 } });
  const [dimensions, setDimensions] = useState(dimensionsRef.current);
  const [isDragging, setDragging] = useState(false);
  const [isSpacePressed, setSpacePressed] = useState(false);

  // Coalesce input events to one render per frame; refs always hold the latest coordinates.
  const updateView = useCallback((next: View) => {
    viewRef.current = next;
    if (!pendingFrame.current)
      pendingFrame.current = requestAnimationFrame(() => {
        pendingFrame.current = 0;
        setView(viewRef.current);
      });
  }, []);

  const resetView = useCallback(() => {
    const { viewport, content } = dimensionsRef.current;
    updateView(fitView(viewport, content, { minZoom, maxZoom }));
  }, [minZoom, maxZoom, updateView]);

  const setOffset = useCallback(
    (offset: Point) => {
      const { viewport, content } = dimensionsRef.current;
      updateView(constrainView({ ...viewRef.current, offset }, viewport, content));
    },
    [updateView],
  );

  const setZoom = useCallback(
    (value: number, anchor?: Point) => {
      const { viewport, content } = dimensionsRef.current;
      updateView(
        constrainView(zoomAt(viewRef.current, value, anchor ?? { x: viewport.width / 2, y: viewport.height / 2 }, { minZoom, maxZoom }), viewport, content),
      );
    },
    [minZoom, maxZoom, updateView],
  );

  const zoomBy = useCallback((direction: number) => setZoom(viewRef.current.zoom + direction * step), [setZoom, step]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    let frame = 0;
    let initialized = false;
    let lastVisibleViewport: Size = { width: 0, height: 0 };
    const measure = () => {
      frame = 0;
      const next = {
        viewport: { width: container.clientWidth, height: container.clientHeight },
        content: { width: content.offsetWidth, height: content.offsetHeight },
      };
      // Hidden tabs do not overwrite the last usable size or view.
      if (!next.viewport.width || !next.viewport.height) return;
      const previous = dimensionsRef.current;
      dimensionsRef.current = next;
      if (
        previous.viewport.width !== next.viewport.width ||
        previous.viewport.height !== next.viewport.height ||
        previous.content.width !== next.content.width ||
        previous.content.height !== next.content.height
      )
        setDimensions(next);
      if (!initialized || next.viewport.width !== lastVisibleViewport.width || next.viewport.height !== lastVisibleViewport.height) {
        if (next.content.width && next.content.height) {
          initialized = true;
          resetView();
        }
      } else if (next.content.width !== previous.content.width || next.content.height !== previous.content.height) {
        // Preserve the user's zoom when nodes change, correcting only an out-of-bounds position.
        updateView(constrainView(viewRef.current, next.viewport, next.content));
      }
      lastVisibleViewport = next.viewport;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    observer.observe(content);
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [resetView, updateView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let space = false;
    let drag: { id: number; start: Point; offset: Point } | undefined;
    let suppressClick = false;
    const finish = () => {
      const id = drag?.id;
      drag = undefined;
      setDragging(false);
      if (id !== undefined && container.hasPointerCapture(id)) container.releasePointerCapture(id);
    };
    const resetInput = () => {
      space = false;
      setSpacePressed(false);
      finish();
    };
    const wheel = (event: WheelEvent) => {
      if (drag || isControl(event.target) || !event.deltaY) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? container.clientHeight : 1);
      setZoom(viewRef.current.zoom * Math.exp((-Math.max(-200, Math.min(200, delta)) * step) / 100), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    const keyDown = (event: KeyboardEvent) => {
      if (isControl(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === 'Space') {
        event.preventDefault();
        space = true;
        setSpacePressed(true);
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomBy(1);
      }
      if (event.key === '-') {
        event.preventDefault();
        zoomBy(-1);
      }
      if (event.key === '0') {
        event.preventDefault();
        resetView();
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        space = false;
        setSpacePressed(false);
      }
    };
    const pointerDown = (event: PointerEvent) => {
      if (drag || isEditable(event.target)) return;
      suppressClick = false;
      if (event.button !== 1 && !(event.button === 0 && space)) {
        if (!isControl(event.target)) container.focus({ preventScroll: true });
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      container.focus({ preventScroll: true });
      drag = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, offset: viewRef.current.offset };
      suppressClick = true;
      container.setPointerCapture(event.pointerId);
      setDragging(true);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      setOffset({ x: drag.offset.x + event.clientX - drag.start.x, y: drag.offset.y + event.clientY - drag.start.y });
    };
    const click = (event: MouseEvent) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }
    };
    const focusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !container.contains(event.relatedTarget)) resetInput();
    };
    const visibility = () => {
      if (document.hidden) resetInput();
    };
    container.addEventListener('wheel', wheel, { passive: false });
    container.addEventListener('keydown', keyDown);
    container.addEventListener('keyup', keyUp);
    container.addEventListener('focusout', focusOut);
    container.addEventListener('pointerdown', pointerDown, true);
    container.addEventListener('pointermove', pointerMove);
    container.addEventListener('pointerup', finish);
    container.addEventListener('pointercancel', finish);
    container.addEventListener('lostpointercapture', finish);
    container.addEventListener('click', click, true);
    window.addEventListener('blur', resetInput);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      finish();
      container.removeEventListener('wheel', wheel);
      container.removeEventListener('keydown', keyDown);
      container.removeEventListener('keyup', keyUp);
      container.removeEventListener('focusout', focusOut);
      container.removeEventListener('pointerdown', pointerDown, true);
      container.removeEventListener('pointermove', pointerMove);
      container.removeEventListener('pointerup', finish);
      container.removeEventListener('pointercancel', finish);
      container.removeEventListener('lostpointercapture', finish);
      container.removeEventListener('click', click, true);
      window.removeEventListener('blur', resetInput);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [setOffset, setZoom, zoomBy, resetView, step]);

  useEffect(
    () => () => {
      cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = 0;
    },
    [],
  );

  return { containerRef, contentRef, ...view, ...dimensions, isDragging, isSpacePressed, setOffset, setZoom, zoomBy, resetView };
}
