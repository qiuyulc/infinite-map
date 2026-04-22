import type { Camera } from '../core/types';
import { useRef, type MutableRefObject, type PointerEventHandler, type RefObject } from 'react';

type Params = {
  containerRef: RefObject<HTMLElement | null>;
  mouseRef: MutableRefObject<{ x: number; y: number } | null>;
  cameraRef: MutableRefObject<Camera>;
  commitCamera: (next: Camera, immediate?: boolean) => void;
};

export function usePointerPan({ containerRef, mouseRef, cameraRef, commitCamera }: Params) {
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startCamX: number;
    startCamY: number;
  }>({ active: false, startX: 0, startY: 0, startCamX: 0, startCamY: 0 });

  const onPointerDown: PointerEventHandler = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startCamX: cameraRef.current.x,
      startCamY: cameraRef.current.y,
    };
  };

  const onPointerMove: PointerEventHandler = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!dragRef.current.active) return;
    e.preventDefault();
    const cam = cameraRef.current;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const nextX = dragRef.current.startCamX - dx / cam.zoom;
    const nextY = dragRef.current.startCamY - dy / cam.zoom;
    commitCamera({ x: nextX, y: nextY, zoom: cam.zoom }, true);
  };

  const onPointerUp: PointerEventHandler = () => {
    dragRef.current.active = false;
  };

  const onPointerLeave: PointerEventHandler = () => {
    dragRef.current.active = false;
    mouseRef.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave };
}
