import { STORE_KEYS, type Camera, type Command, type InfiniteMapPlugin, type MapContext, type NodeData, type Rect } from '@qiuyulc/infinite-map';

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function bboxFromNodes(nodes: NodeData[]): Rect | null {
  if (nodes.length === 0) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

function bboxFromNodesIncludingOrigin(nodes: NodeData[]): Rect | null {
  if (nodes.length === 0) return { x: 0, y: 0, w: 1, h: 1 };
  const b = bboxFromNodes(nodes);
  if (!b) return { x: 0, y: 0, w: 1, h: 1 };
  const minX = Math.min(b.x, 0);
  const minY = Math.min(b.y, 0);
  const maxX = Math.max(b.x + b.w, 0);
  const maxY = Math.max(b.y + b.h, 0);
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

function getCameraService(ctx: MapContext) {
  return ctx.getService<{ get: () => Camera; set: (c: Camera, immediate?: boolean) => void }>('camera');
}

function getLimits(ctx: MapContext): { minZoom: number; maxZoom: number; zoomStep: number; paddingPx: number } {
  const cfg =
    ctx.store.get<{
      minZoom?: number;
      maxZoom?: number;
      zoomStep?: number;
      /**
       * fit 时的 padding（屏幕像素）
       * - 更符合编辑器直觉（与 zoom 无关）
       */
      paddingPx?: number;
      /**
       * @deprecated 旧字段：世界坐标 padding（保留兼容）
       */
      paddingWorld?: number;
    }>(STORE_KEYS.viewConfig) ?? {};
  return {
    minZoom: cfg.minZoom ?? 0.25,
    maxZoom: cfg.maxZoom ?? 2.5,
    zoomStep: cfg.zoomStep ?? 1.2,
    paddingPx: cfg.paddingPx ?? 48,
  };
}

function setCamera(ctx: MapContext, next: Camera, immediate?: boolean) {
  const svc = getCameraService(ctx);
  if (svc?.set) svc.set(next, immediate);
  else ctx.bus.emit('camera:change', { camera: next, immediate: Boolean(immediate) });
}

function fitRect(ctx: MapContext, rect: Rect, opts?: { paddingPx?: number; immediate?: boolean }) {
  const { minZoom, maxZoom, paddingPx } = getLimits(ctx);
  const padPx = opts?.paddingPx ?? paddingPx;
  const vp = ctx.getViewport();
  const availW = Math.max(1, vp.w - padPx * 2);
  const availH = Math.max(1, vp.h - padPx * 2);
  const z = clamp(Math.min(availW / rect.w, availH / rect.h), minZoom, maxZoom);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  setCamera(ctx, { x: cx - vp.w / 2 / z, y: cy - vp.h / 2 / z, zoom: z }, opts?.immediate);
}

function centerRect(ctx: MapContext, rect: Rect, opts?: { immediate?: boolean }) {
  const cam = getCameraService(ctx)?.get?.() ?? ctx.getCamera();
  const vp = ctx.getViewport();
  const z = cam.zoom || 1;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  setCamera(ctx, { x: cx - vp.w / 2 / z, y: cy - vp.h / 2 / z, zoom: z }, opts?.immediate);
}

function getSelectedNodes(ctx: MapContext) {
  const sel = ctx.getService<{ getIds: () => string[] }>('selection');
  const ids = sel?.getIds() ?? [];
  if (ids.length === 0) return [];
  const byId = new Map(ctx.getNodes().map((n) => [n.id, n]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as NodeData[];
}

export type ViewCommandsPluginOptions = {
  /**
   * fit 时的 padding（屏幕像素）
   */
  paddingPx?: number;
  /**
   * zoom 步进倍率（>1 放大；缩小时取倒数）
   */
  zoomStep?: number;
};

export function createViewCommandsPlugin(opts: ViewCommandsPluginOptions = {}): InfiniteMapPlugin {
  return {
    id: 'view',
    provides: ['view'],
    requires: ['commands', 'camera'],
    setup: (ctx) => {
      // 将配置写入 store，便于命令实现读取（不依赖闭包）
      const prev = ctx.store.get<{
        minZoom?: number;
        maxZoom?: number;
        zoomStep?: number;
        paddingPx?: number;
      }>(STORE_KEYS.viewConfig);
      ctx.store.set(STORE_KEYS.viewConfig, {
        ...prev,
        paddingPx: opts.paddingPx ?? prev?.paddingPx,
        zoomStep: opts.zoomStep ?? prev?.zoomStep,
      });
    },
    commands: {
      'view.zoomIn': {
        id: 'view.zoomIn',
        title: 'Zoom in',
        shortcut: 'Mod+=',
        run: (ctx) => {
          const { minZoom, maxZoom, zoomStep } = getLimits(ctx);
          const cam = getCameraService(ctx)?.get?.() ?? ctx.getCamera();
          const nextZoom = clamp(cam.zoom * zoomStep, minZoom, maxZoom);
          setCamera(ctx, { ...cam, zoom: nextZoom });
        },
      },
      'view.zoomOut': {
        id: 'view.zoomOut',
        title: 'Zoom out',
        shortcut: 'Mod+-',
        run: (ctx) => {
          const { minZoom, maxZoom, zoomStep } = getLimits(ctx);
          const cam = getCameraService(ctx)?.get?.() ?? ctx.getCamera();
          const nextZoom = clamp(cam.zoom / zoomStep, minZoom, maxZoom);
          setCamera(ctx, { ...cam, zoom: nextZoom });
        },
      },
      'view.resetZoom': {
        id: 'view.resetZoom',
        title: 'Reset zoom',
        run: (ctx) => {
          const { minZoom, maxZoom } = getLimits(ctx);
          const cam = getCameraService(ctx)?.get?.() ?? ctx.getCamera();
          setCamera(ctx, { ...cam, zoom: clamp(1, minZoom, maxZoom) });
        },
      },
      'view.fitView': {
        id: 'view.fitView',
        title: 'Fit view',
        run: (ctx) => {
          // 组件库约定：fitView 也应包含原点(0,0)，保证配合标尺时不会把原点挤到视口之外
          const rect = bboxFromNodesIncludingOrigin(ctx.getNodes());
          if (!rect) return;
          fitRect(ctx, rect);
        },
      },
      'view.centerView': {
        id: 'view.centerView',
        title: 'Center view',
        run: (ctx) => {
          // 组件库约定：Center view 表示“把世界原点(0,0)放到视口中心”（便于配合标尺）
          const cam = getCameraService(ctx)?.get?.() ?? ctx.getCamera();
          const vp = ctx.getViewport();
          const z = cam.zoom || 1;
          setCamera(ctx, { x: -(vp.w / 2) / z, y: -(vp.h / 2) / z, zoom: z });
        },
      },
      'view.fitSelection': {
        id: 'view.fitSelection',
        title: 'Fit selection',
        run: (ctx) => {
          const rect = bboxFromNodes(getSelectedNodes(ctx));
          if (!rect) return;
          fitRect(ctx, rect);
        },
      },
      'view.centerSelection': {
        id: 'view.centerSelection',
        title: 'Center selection',
        run: (ctx) => {
          const rect = bboxFromNodes(getSelectedNodes(ctx));
          if (!rect) return;
          centerRect(ctx, rect);
        },
      },
    } satisfies Record<string, Command>,
  };
}
