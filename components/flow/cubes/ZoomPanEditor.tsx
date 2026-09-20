import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { MinusOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Popover, Space, theme } from 'antd';
import useZoomPan, { type ZoomPanOptions } from '../hooks/useZoomPan';
import useMinimapShapes from '../hooks/useMinimapShapes';
import type { MinimapShape } from '../utils/flowMinimap';
import { getMinimap, minimapOffset, type Point } from '../utils/zoomPanGeometry';
import './ZoomPanEditor.scss';

interface ZoomPanEditorProps extends ZoomPanOptions {
  children: ReactNode;
  miniMapWidth?: number;
  miniMapHeight?: number;
  toolbar?: ReactNode;
  leftTop?: ReactNode;
  getMinimapShapes?: (root: HTMLElement) => MinimapShape[];
}

export default function ZoomPanEditor({
  children,
  miniMapWidth = 200,
  miniMapHeight = 150,
  toolbar,
  leftTop,
  getMinimapShapes,
  ...options
}: ZoomPanEditorProps) {
  const { token } = theme.useToken();
  const controller = useZoomPan(options);
  const { containerRef, contentRef, zoom, offset, viewport, content, isDragging, isSpacePressed, setOffset, setZoom, zoomBy, resetView } = controller;
  const shapes = useMinimapShapes(contentRef, getMinimapShapes);
  const mapSize = { width: Math.max(80, Math.min(miniMapWidth, viewport.width - 24)), height: Math.max(60, Math.min(miniMapHeight, viewport.height / 3)) };
  const map = getMinimap({ zoom, offset }, viewport, content, mapSize);
  const miniDrag = useRef<{ id: number; grab: Point; map: typeof map; zoom: number } | null>(null);
  const miniMapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reset = () => {
      const id = miniDrag.current?.id;
      miniDrag.current = null;
      if (id !== undefined && miniMapRef.current?.hasPointerCapture(id)) miniMapRef.current.releasePointerCapture(id);
    };
    window.addEventListener('blur', reset);
    return () => {
      reset();
      window.removeEventListener('blur', reset);
    };
  }, []);
  const ready = content.width > 0 && content.height > 0;
  const projection = useMemo(
    () =>
      shapes.map((shape, index) =>
        shape.kind === 'node' ? (
          <rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={4} className="fa-zoom-minimap-node" />
        ) : (
          <line key={index} x1={shape.x} y1={shape.y} x2={shape.x2} y2={shape.y2} className="fa-zoom-minimap-line" />
        ),
      ),
    [shapes],
  );

  const miniPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left - event.currentTarget.clientLeft) * mapSize.width) / event.currentTarget.clientWidth,
      y: ((event.clientY - rect.top - event.currentTarget.clientTop) * mapSize.height) / event.currentTarget.clientHeight,
    };
  };
  const startMiniDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || miniDrag.current) return;
    event.preventDefault();
    const point = miniPoint(event);
    const inside =
      point.x >= map.viewport.x &&
      point.x <= map.viewport.x + map.viewport.width &&
      point.y >= map.viewport.y &&
      point.y <= map.viewport.y + map.viewport.height;
    const grab = inside ? { x: point.x - map.viewport.x, y: point.y - map.viewport.y } : { x: map.viewport.width / 2, y: map.viewport.height / 2 };
    miniDrag.current = { id: event.pointerId, grab, map, zoom };
    event.currentTarget.setPointerCapture(event.pointerId);
    setOffset(minimapOffset(point, grab, map, zoom));
  };
  const moveMiniDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = miniDrag.current;
    if (drag?.id === event.pointerId) setOffset(minimapOffset(miniPoint(event), drag.grab, drag.map, drag.zoom));
  };
  const stopMiniDrag = (event: PointerEvent<HTMLDivElement>) => {
    miniDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      className="fa-full fa-relative fa-zoom-pan-editor"
      style={
        {
          '--zoom-panel-bg': token.colorBgContainer,
          '--zoom-border': token.colorBorderSecondary,
          '--zoom-primary': token.colorPrimary,
          '--zoom-primary-bg': token.colorPrimaryBg,
          '--zoom-text': token.colorTextSecondary,
          '--zoom-shadow': token.boxShadowSecondary,
        } as CSSProperties
      }
    >
      <section
        ref={containerRef}
        className={`fa-zoom-pan-editor-container ${isDragging ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : ''}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard zoom/pan requires focus scoped to this canvas.
        tabIndex={0}
        aria-label="流程画布，点击后可用空格加左键或中键平移，加减键缩放，0键适应画布"
      >
        <div className="fa-zoom-pan-transform" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
          <div ref={contentRef} className="fa-zoom-pan-content">
            {children}
          </div>
        </div>
      </section>

      {leftTop && <div className="fa-zoom-pan-left-top">{leftTop}</div>}
      <Space className="fa-zoom-pan-editor-toolbar">
        {toolbar}
        <Popover
          content={
            <ol>
              <li>在画布上滚动鼠标滚轮，围绕指针缩放</li>
              <li>点击画布后，空格 + 左键或鼠标中键拖动平移</li>
              <li>点击小地图定位，拖动视口框平移</li>
              <li>画布聚焦时，+ / − 缩放，0 适应画布</li>
            </ol>
          }
          placement="bottomRight"
        >
          <Button aria-label="画布操作帮助" icon={<QuestionCircleOutlined />} />
        </Popover>
      </Space>
      <Space className="fa-zoom-pan-controls" size={4} role="group" aria-label="画布缩放">
        <Button aria-label="缩小" icon={<MinusOutlined />} disabled={!ready || zoom <= (options.minZoom ?? 0.1)} onClick={() => zoomBy(-1)} />
        <Button
          className="fa-zoom-pan-percentage"
          title="恢复 100%"
          aria-label={`当前缩放 ${Math.round(zoom * 100)}%，恢复100%`}
          disabled={!ready}
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button aria-label="放大" icon={<PlusOutlined />} disabled={!ready || zoom >= (options.maxZoom ?? 4)} onClick={() => zoomBy(1)} />
        <Button disabled={!ready} onClick={resetView}>
          适应画布
        </Button>
      </Space>
      {ready && getMinimapShapes && (
        <div
          ref={miniMapRef}
          aria-hidden="true"
          className="fa-zoom-pan-editor-minimap"
          style={{ width: mapSize.width, height: mapSize.height }}
          onPointerDown={startMiniDrag}
          onPointerMove={moveMiniDrag}
          onPointerUp={stopMiniDrag}
          onPointerCancel={stopMiniDrag}
          onLostPointerCapture={() => {
            miniDrag.current = null;
          }}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${mapSize.width} ${mapSize.height}`} preserveAspectRatio="none" focusable="false" aria-hidden="true">
            <g transform={`translate(${map.origin.x} ${map.origin.y}) scale(${map.scale})`}>{projection}</g>
            <rect {...map.viewport} className="fa-zoom-minimap-viewport" />
          </svg>
        </div>
      )}
    </div>
  );
}
