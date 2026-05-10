import { useEffect, useRef, useState, type RefObject } from 'react';

export function useViewportSize(containerRef: RefObject<HTMLElement | null>) {
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const viewportRef = useRef(viewport);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      // 用 ResizeObserverEntry.contentRect 比 getBoundingClientRect 更稳定（避免 sub-pixel 抖动）
      const cr = entries[0]?.contentRect;
      const width = cr?.width ?? el.getBoundingClientRect().width;
      const height = cr?.height ?? el.getBoundingClientRect().height;

      const next = { w: Math.max(1, Math.round(width)), h: Math.max(1, Math.round(height)) };
      const prev = viewportRef.current;
      if (next.w === prev.w && next.h === prev.h) return;

      // 合并到下一帧，避免 resize 过程中频繁 setState 造成重渲染/闪烁
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const p = viewportRef.current;
        if (next.w === p.w && next.h === p.h) return;
        viewportRef.current = next;
        setViewport(next);
      });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [containerRef]);

  return { viewport, viewportRef };
}
