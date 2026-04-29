import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InfiniteMap, STORE_KEYS, type InfiniteMapPlugin, type MapContext, type NodeData } from '@qiuyulc/infinite-map';
import { createDefaultEditorPlugins } from '../editor/createDefaultEditorPlugins';
import { createDefaultEditorPluginsWithUI } from '../createDefaultEditorPluginsWithUI';
import { createMinimapPlugin } from '../plugins/createMinimapPlugin';

function setRect(el: Element, rect: Partial<DOMRect>) {
  (el as any).getBoundingClientRect = () =>
    ({
      x: rect.x ?? 0,
      y: rect.y ?? 0,
      left: rect.left ?? rect.x ?? 0,
      top: rect.top ?? rect.y ?? 0,
      right: (rect.left ?? rect.x ?? 0) + (rect.width ?? 0),
      bottom: (rect.top ?? rect.y ?? 0) + (rect.height ?? 0),
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

function createCapturePlugin(onCtx: (ctx: MapContext) => void): InfiniteMapPlugin {
  return { id: 'test.capture', setup: (ctx) => onCtx(ctx) };
}

describe('InfiniteMap integrations (jsdom)', () => {
  afterEach(() => cleanup());

  it('click selects a node (selection plugin)', async () => {
    let ctxRef: MapContext | null = null;
    const nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' },
      { id: 'b', x: 200, y: 0, width: 80, height: 40, label: 'B' },
    ];

    const plugins = [...createDefaultEditorPlugins(), createCapturePlugin((c) => (ctxRef = c))];
    const { container } = render(<InfiniteMap nodes={nodes} plugins={plugins} onNodesChange={() => void 0} />);

    // InfiniteMap root needs a non-zero bounding rect for correct screenToWorld mapping
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });

    await screen.findByText('A');
    // 等一拍：让 InfiniteMap 内部 useEffect 把 visibleNodesRef 写入（插件命中依赖它）
    await new Promise((r) => setTimeout(r, 0));
    // click on node A
    // 初始 camera 默认为 {x:-400,y:-250,zoom:1}，因此 world(0,0) 对应 screen(400,250)
    // 注意：测试里不做 DOM hit-testing，因此直接对 root 触发事件即可
    fireEvent.pointerDown(root, { pointerId: 1, button: 0, buttons: 1, clientX: 410, clientY: 260 });
    fireEvent.pointerUp(root, { pointerId: 1, button: 0, buttons: 0, clientX: 410, clientY: 260 });

    await waitFor(() => {
      expect(ctxRef).toBeTruthy();
      const ids = ctxRef!.store.get<string[]>(STORE_KEYS.selectionIds) ?? [];
      expect(ids).toEqual(['a']);
    });
  });

  it('selection overlay clears stale pan transform after rerender (virtualization + keepAlive)', async () => {
    let ctxRef: MapContext | null = null;
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' }];

    const plugins = [...createDefaultEditorPlugins(), createCapturePlugin((c) => (ctxRef = c))];
    const { container } = render(
      <InfiniteMap
        nodes={nodes}
        plugins={plugins}
        onNodesChange={() => void 0}
        virtualization={{ enabled: true, keepAlive: () => true }}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });

    await screen.findByText('A');
    await new Promise((r) => setTimeout(r, 0));

    // select node A
    fireEvent.pointerDown(root, { pointerId: 1, button: 0, buttons: 1, clientX: 410, clientY: 260 });
    fireEvent.pointerUp(root, { pointerId: 1, button: 0, buttons: 0, clientX: 410, clientY: 260 });
    await waitFor(() => expect(ctxRef).toBeTruthy());

    // wait selection overlay
    const selectionPluginRoot = await waitFor(() => {
      const el = container.querySelector('div[data-plugin="selection"]') as HTMLElement | null;
      expect(el).toBeTruthy();
      return el!;
    });
    const overlayRoot = await waitFor(() => {
      const el = selectionPluginRoot.querySelector('div[style*="pointer-events: none"]') as HTMLElement | null;
      expect(el).toBeTruthy();
      return el!;
    });
    const viewportDom = await waitFor(() => {
      const el = container.querySelector('div[style*="will-change: transform"][style*="transform-origin: 0 0"]') as HTMLElement | null;
      expect(el).toBeTruthy();
      return el!;
    });

    const before = ctxRef!.getCamera();
    // pan camera by emitting request event (engine 模式下由 useMapRuntimeEffects 处理)
    ctxRef!.bus.emit('camera:set', { camera: { ...before, x: before.x + 100 }, immediate: true } as any);
    await waitFor(() => {
      // 相机变化后 overlay 不重渲染，依赖 imperative transform 跟随
      expect(overlayRoot.style.transform).toContain('translate3d(');
    });

    // 触发一次 overlay re-render（模拟“虚拟化/keepAlive 导致的额外刷新”）
    ctxRef!.requestRender();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    // rerender 后，selection overlay 仍应与 viewport 使用同一份 view.transform（避免缩放/平移时慢半拍）
    await waitFor(() => {
      expect(ctxRef!.getCamera().x).toBe(before.x + 100);
      expect(overlayRoot.style.transform).toBe(viewportDom.style.transform);
    });
  });

  it('hover updates cursor via hitTest pipeline', async () => {
    let ctxRef: MapContext | null = null;
    const nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' },
      { id: 'b', x: 200, y: 0, width: 80, height: 40, label: 'B' },
    ];
    const plugins = [...createDefaultEditorPlugins(), createCapturePlugin((c) => (ctxRef = c))];
    const { container } = render(<InfiniteMap nodes={nodes} plugins={plugins} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });

    await screen.findByText('A');
    // 等两拍：
    // - ResizeObserver fire
    // - visibleNodesRef useEffect
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    // move mouse over node A area
    fireEvent.pointerMove(root, { pointerId: 1, buttons: 0, clientX: 410, clientY: 260 });
    await waitFor(() => expect(root.style.cursor).toBe('grab'));
    await waitFor(() => {
      expect(ctxRef).toBeTruthy();
      const hit = ctxRef!.store.get<any>(STORE_KEYS.hoverHit);
      expect(hit?.kind).toBe('node');
      expect(hit?.id).toBe('a');
    });

    // move mouse to blank area
    fireEvent.pointerMove(root, { pointerId: 1, buttons: 0, clientX: 10, clientY: 10 });
    await waitFor(() => expect(root.style.cursor).toBe('default'));
    await waitFor(() => {
      const hit = ctxRef!.store.get<any>(STORE_KEYS.hoverHit);
      expect(hit?.kind).toBe('blank');
    });

    // leave => hover cleared
    fireEvent.pointerLeave(root, { pointerId: 1, buttons: 0, clientX: 10, clientY: 10 });
    await waitFor(() => {
      const hit = ctxRef!.store.get<any>(STORE_KEYS.hoverHit);
      expect(hit?.kind).toBe('blank');
    });
  });

  it('minimap click changes camera (minimap plugin)', async () => {
    let ctxRef: MapContext | null = null;
    const nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' },
      { id: 'b', x: 400, y: 300, width: 80, height: 40, label: 'B' },
    ];

    const plugins = [...createDefaultEditorPlugins(), createMinimapPlugin({ width: 260, height: 160 }), createCapturePlugin((c) => (ctxRef = c))];

    const { container } = render(<InfiniteMap nodes={nodes} plugins={plugins} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });

    // minimap canvas is inside a UI root (data-im-ui) and is the only canvas there
    const canvas = await waitFor(() => {
      const c = container.querySelector('div[data-im-ui] canvas') as HTMLCanvasElement | null;
      expect(c).toBeTruthy();
      return c!;
    });
    setRect(canvas, { width: 260, height: 160, left: 0, top: 0 });

    // allow effects to run (transformRef in minimap)
    await waitFor(() => expect(ctxRef).toBeTruthy());
    const beforeX = ctxRef!.getCamera().x;

    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, buttons: 1, clientX: 5, clientY: 5 });

    await waitFor(() => {
      const afterX = ctxRef!.getCamera().x;
      expect(afterX).not.toBe(beforeX);
    });
  });

  it('snap toggle disables snapping and clears guides (zoomDock)', async () => {
    let ctxRef: MapContext | null = null;
    const nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' },
      { id: 'b', x: 400, y: 300, width: 80, height: 40, label: 'B' },
    ];

    const plugins = [...createDefaultEditorPluginsWithUI({ zoomDock: { enabled: true } }), createCapturePlugin((c) => (ctxRef = c))];
    const { container } = render(<InfiniteMap nodes={nodes} plugins={plugins} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });

    await waitFor(() => expect(ctxRef).toBeTruthy());
    // 先手动塞一条辅助线，验证关闭时会清空
    ctxRef!.store.set(STORE_KEYS.snapGuides, { v: [10], h: [20] });
    ctxRef!.requestRender();
    await waitFor(() => {
      const anyGuide = container.querySelector('[data-im-guide]') as HTMLElement | null;
      expect(anyGuide).toBeTruthy();
    });

    const btn = await waitFor(() => {
      const el = container.querySelector('button[data-im-snap-toggle]') as HTMLButtonElement | null;
      expect(el).toBeTruthy();
      return el!;
    });

    // disable
    fireEvent.click(btn);
    await waitFor(() => {
      const cfg = ctxRef!.store.get<any>(STORE_KEYS.snapConfig);
      expect(cfg?.enabled).toBe(false);
      expect(ctxRef!.store.get<any>(STORE_KEYS.snapGuides)).toBeFalsy();
      expect(container.querySelector('[data-im-guide]')).toBeFalsy();
    });

    // enable
    fireEvent.click(btn);
    await waitFor(() => {
      const cfg = ctxRef!.store.get<any>(STORE_KEYS.snapConfig);
      expect(cfg?.enabled).toBe(true);
    });
  });
});
