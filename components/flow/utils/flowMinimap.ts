import type { Point, Size } from './zoomPanGeometry';

export type MinimapShape = (Point & Size & { kind: 'node' }) | (Point & { kind: 'line'; x2: number; y2: number });

/** offsetParent coordinates are layout pixels, unaffected by the editor's translate/scale. */
function layoutBox(element: HTMLElement, root: HTMLElement): Point & Size {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    x += current.offsetLeft;
    y += current.offsetTop;
    const parent = current.offsetParent as HTMLElement | null;
    if (parent && parent !== root) {
      x += parent.clientLeft;
      y += parent.clientTop;
    }
    current = parent;
  }
  return { x, y, width: element.offsetWidth, height: element.offsetHeight };
}

/** Static geometry only: no cloned DOM, React nodes, business state, drawers or event handlers. */
export function getFlowMinimapShapes(root: HTMLElement): MinimapShape[] {
  const lines: MinimapShape[] = [];
  const nodes: MinimapShape[] = [];
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('.node-wrap-box, .auto-judge'))) {
    const box = layoutBox(element, root);
    if (box.width && box.height) nodes.push({ kind: 'node', ...box });
  }
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('.add-node-btn-box, .col-box'))) {
    const box = layoutBox(element, root);
    lines.push({ kind: 'line', x: box.x + box.width / 2, y: box.y, x2: box.x + box.width / 2, y2: box.y + box.height });
  }
  for (const branch of Array.from(root.querySelectorAll<HTMLElement>('.branch-box'))) {
    const columns = Array.from(branch.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains('col-box'),
    );
    if (!columns.length) continue;
    const first = layoutBox(columns[0], root);
    const last = layoutBox(columns[columns.length - 1], root);
    const box = layoutBox(branch, root);
    for (const y of [box.y, box.y + box.height]) {
      lines.push({ kind: 'line', x: first.x + first.width / 2, y, x2: last.x + last.width / 2, y2: y });
    }
  }
  return [...lines, ...nodes];
}
