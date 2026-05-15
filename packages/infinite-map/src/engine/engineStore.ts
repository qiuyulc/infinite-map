import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Camera } from '../core/types';

export type ViewSnapshot = Camera & {
  /**
   * 用于直接写入 DOM 的 transform 字符串
   * - 原点位于视口中心：translate3d(vp.w/2 - x*zoom, vp.h/2 - y*zoom, 0) scale(zoom)
   */
  transform: string;
};

export type EngineState = {
  /**
   * 低频/可序列化快照（供 React/插件读取）
   * 注意：高频交互时也可以更新它，但必须禁止任何 React hook 订阅该字段。
   */
  view: ViewSnapshot;
  viewport: { w: number; h: number };
  interaction: {
    panning: boolean;
    draggingNode: boolean;
  };
  /**
   * 当前渲染的节点 id（虚拟化结果）
   * - React 层只允许订阅该 ids 数组（浅比较），避免 camera 变化触发 Fiber 扫描
   */
  visibleNodeIds: string[];
};

export type EngineActions = {
  setViewport: (vp: { w: number; h: number }) => void;
  setInteraction: (next: Partial<EngineState['interaction']>) => void;
  /**
   * 设置 view 快照（通常由原生轨道驱动）
   */
  setView: (next: Camera) => void;
  setVisibleNodeIds: (ids: string[]) => void;
};

export type EngineStore = ReturnType<typeof createEngineStore>;

export function cameraToTransform(cam: Camera, vp: { w: number; h: number }): string {
  const z = cam.zoom || 1;
  const cx = vp.w / 2 - cam.x * z;
  const cy = vp.h / 2 - cam.y * z;
  return `translate3d(${cx}px, ${cy}px, 0) scale(${z})`;
}

export function createEngineStore(initialCamera: Camera) {
  return createStore(
    subscribeWithSelector<EngineState & EngineActions>((set, get) => ({
      view: { ...initialCamera, transform: '' },
      viewport: { w: 0, h: 0 },
      interaction: { panning: false, draggingNode: false },
      visibleNodeIds: [],
      setViewport: (vp) => {
        const cam = get().view as Camera;
        set({ viewport: vp, view: { ...cam, transform: cameraToTransform(cam, vp) } });
      },
      setInteraction: (next) =>
        set((s) => ({
          interaction: { ...s.interaction, ...next },
        })),
      setView: (next) =>
        set((s) => ({
          view: { ...next, transform: cameraToTransform(next, s.viewport) },
        })),
      setVisibleNodeIds: (ids) => set({ visibleNodeIds: ids }),
    }))
  );
}
