import { useLayoutEffect, useState, type RefObject } from 'react';
import type { MinimapShape } from '../utils/flowMinimap';

export default function useMinimapShapes(contentRef: RefObject<HTMLDivElement>, measure?: (root: HTMLElement) => MinimapShape[]) {
  const [shapes, setShapes] = useState<MinimapShape[]>([]);
  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root || !measure) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Hidden tabs retain their static projection until their layout is visible again.
      if (!root.offsetWidth || !root.offsetHeight) return;
      setShapes(measure(root));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    const mutations = new MutationObserver(schedule);
    mutations.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
    update();
    return () => {
      resize.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [contentRef, measure]);
  return shapes;
}
