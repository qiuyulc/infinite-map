import type { MapContext } from './types';

export type SnapConfig = { enabled: boolean; gridSize: number | 'auto'; thresholdPx: number; gridTargetPx?: number };

export function snapToGrid(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

export function bboxOf(nodes: Array<{ x: number; y: number; width: number; height: number }>) {
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function setSnapGuides(ctx: MapContext, guides: { v?: number[]; h?: number[] } | null, storeKey: string) {
  ctx.store.set(storeKey, guides);
  ctx.requestRender();
}

export function getViewportCenterWorld(ctx: MapContext) {
  const cam = ctx.getCamera();
  const vp = ctx.getViewport();
  const z = cam.zoom || 1;
  return { x: cam.x + vp.w / (2 * z), y: cam.y + vp.h / (2 * z) };
}
