import type { MapContext } from '@qiuyulc/infinite-map';

export type SnapConfig = { enabled: boolean; gridSize: number | 'auto'; thresholdPx: number; gridTargetPx?: number };

export function snapToGrid(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * 计算一组节点的边界框
 * @param nodes - 节点数组，每个节点包含x坐标、y坐标、宽度和高度
 * @returns 返回一个边界框对象，包含x坐标、y坐标、宽度和高度
 */
export function bboxOf(nodes: Array<{ x: number; y: number; width: number; height: number }>) {
  // 计算所有节点的最小x坐标
  const minX = Math.min(...nodes.map((n) => n.x));
  // 计算所有节点的最小y坐标
  const minY = Math.min(...nodes.map((n) => n.y));
  // 计算所有节点的最大x坐标加上宽度后的值
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  // 计算所有节点的最大y坐标加上高度后的值
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  // 返回边界框对象，x和y为最小坐标，w和h为计算得到的宽度和高度
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

