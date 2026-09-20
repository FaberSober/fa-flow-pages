export interface Point {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}
export interface View {
  zoom: number;
  offset: Point;
}
export interface ZoomBounds {
  minZoom: number;
  maxZoom: number;
}

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Keep the viewport centre within the graph, so panning cannot lose the graph. */
export function constrainView(view: View, viewport: Size, content: Size): View {
  return {
    zoom: view.zoom,
    offset: {
      x: clamp(view.offset.x, viewport.width / 2 - content.width * view.zoom, viewport.width / 2),
      y: clamp(view.offset.y, viewport.height / 2 - content.height * view.zoom, viewport.height / 2),
    },
  };
}

export function fitView(viewport: Size, content: Size, bounds: ZoomBounds, padding = 64): View {
  const zoom = clamp(
    Math.min(
      Math.max(1, viewport.width - padding * 2) / Math.max(1, content.width),
      Math.max(1, viewport.height - padding * 2) / Math.max(1, content.height),
      1,
    ),
    bounds.minZoom,
    bounds.maxZoom,
  );
  return { zoom, offset: { x: (viewport.width - content.width * zoom) / 2, y: (viewport.height - content.height * zoom) / 2 } };
}

export function zoomAt(view: View, zoom: number, anchor: Point, bounds: ZoomBounds): View {
  const nextZoom = clamp(zoom, bounds.minZoom, bounds.maxZoom);
  const ratio = nextZoom / view.zoom;
  return {
    zoom: nextZoom,
    offset: { x: anchor.x + (view.offset.x - anchor.x) * ratio, y: anchor.y + (view.offset.y - anchor.y) * ratio },
  };
}

/** Include half a viewport around the graph, so even fitted graphs have a complete draggable viewport rectangle. */
export function getMinimap(view: View, viewport: Size, content: Size, mapSize: Size) {
  const visible = { width: viewport.width / view.zoom, height: viewport.height / view.zoom };
  const world = { x: -visible.width / 2, y: -visible.height / 2, width: content.width + visible.width, height: content.height + visible.height };
  const scale = Math.min(Math.max(1, mapSize.width - 16) / Math.max(1, world.width), Math.max(1, mapSize.height - 16) / Math.max(1, world.height));
  const origin = { x: (mapSize.width - world.width * scale) / 2 - world.x * scale, y: (mapSize.height - world.height * scale) / 2 - world.y * scale };
  return {
    scale,
    origin,
    viewport: {
      x: origin.x - (view.offset.x / view.zoom) * scale,
      y: origin.y - (view.offset.y / view.zoom) * scale,
      width: visible.width * scale,
      height: visible.height * scale,
    },
  };
}

export function minimapOffset(point: Point, grab: Point, map: ReturnType<typeof getMinimap>, zoom: number): Point {
  return { x: (-(point.x - grab.x - map.origin.x) / map.scale) * zoom, y: (-(point.y - grab.y - map.origin.y) / map.scale) * zoom };
}
