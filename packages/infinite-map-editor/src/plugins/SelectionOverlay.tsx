import { useEffect, useRef, type CSSProperties } from 'react';
import { STORE_KEYS, VISUAL_CONST, type MapContext } from '@qiuyulc/infinite-map';

const STORE_KEY = STORE_KEYS.selectionIds;

export function SelectionOverlay({ ctx }: { ctx: MapContext }) {
  const ids = ctx.store.get<string[]>(STORE_KEY) ?? [];
  if (ids.length === 0) return null;

  const editEnabled = ctx.store.get<boolean>(STORE_KEYS.editEnabled);
  // 只读/无变更出口：不渲染任何选中态 UI（避免误导用户“可以编辑”）
  if (editEnabled === false) return null;

  const nodes = ctx.getNodes();
  const selected = new Set(ids);

  const selectedNodes = nodes.filter((n) => selected.has(n.id) && !n.hidden);
  if (selectedNodes.length === 0) return null;

  // Engine 模式下：
  // - 节点拖拽 move：只改 DOM（数据不变）=> 选中框需要跟随拖拽位移
  // - 地图拖拽（pan）：cameraRef 在变，但 overlay 不一定重渲染 => 选中框需要跟随 camera 变化
  const engine = ctx.getService<{ store: any }>('engine');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  /**
   * 选中框“本次 React 渲染”所使用的 camera 快照。
   * - 如果组件因为容器 resize 等原因发生 re-render，这里会更新为最新 camera，
   *   从而避免我们在 effect 里继续叠加旧的平移补偿导致错位。
   */
  const baseCamRef = useRef<{ x: number; y: number; zoom: number } | null>(null);

  const drag = ctx.store.get<any>(STORE_KEYS.dragState);
  let dragDxPx = 0;
  let dragDyPx = 0;
  if (drag?.startById && drag?.lastById) {
    const anyId: string | undefined = drag.primaryId ?? drag.ids?.[0];
    const s = anyId ? drag.startById[anyId] : null;
    const l = anyId ? drag.lastById[anyId] : null;
    if (s && l) {
      const zoom = ctx.getCamera().zoom || 1;
      dragDxPx = (l.x - s.x) * zoom;
      dragDyPx = (l.y - s.y) * zoom;
    }
  }
  dragOffsetRef.current.x = dragDxPx;
  dragOffsetRef.current.y = dragDyPx;

  // 每次渲染时，刷新 base camera（用于“相对本次渲染”计算平移补偿）
  // 注意：worldToScreen 只依赖 camera，不依赖 viewport 尺寸，因此 resize 导致的 re-render
  // 需要把 baseCam 更新到当前 camera，避免 translate 重复应用。
  const camNow = ctx.getCamera();
  baseCamRef.current = { x: camNow.x, y: camNow.y, zoom: camNow.zoom || 1 };

  // 订阅 camera 变化：只做屏幕空间 translate，避免让 overlay 走 React render
  useEffect(() => {
    if (!engine?.store) return;
    const el = rootRef.current;
    if (!el) return;

    let raf: number | null = null;
    let pendingCam: { x: number; y: number; zoom: number } | null = null;

    const apply = () => {
      raf = null;
      const cam = pendingCam ?? engine.store.getState().view;
      pendingCam = null;

      const base = baseCamRef.current;
      const z1 = cam.zoom || 1;

      // zoom 变化时：仅靠 translate 无法修正（handle 尺寸与旋转边框都依赖 zoom）
      // 这里触发一次 overlay re-render 来刷新几何。
      if (base && Math.abs(z1 - base.zoom) > 1e-6) {
        ctx.requestRender();
        baseCamRef.current = { x: cam.x, y: cam.y, zoom: z1 };
      }

      const dxWorld = base ? cam.x - base.x : 0;
      const dyWorld = base ? cam.y - base.y : 0;
      const panDxPx = -dxWorld * z1;
      const panDyPx = -dyWorld * z1;

      const x = panDxPx + dragOffsetRef.current.x;
      const y = panDyPx + dragOffsetRef.current.y;
      el.style.transform = x || y ? `translate3d(${x}px, ${y}px, 0)` : '';
      el.style.willChange = x || y ? 'transform' : '';
    };

    // init
    apply();

    const un = engine.store.subscribe(
      (s: any) => s.view,
      (v: any) => {
        pendingCam = v;
        if (raf != null) return;
        raf = requestAnimationFrame(apply);
      },
      { equalityFn: () => false }
    );
    return () => {
      un?.();
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [ctx, engine]);

  const boxStyle: CSSProperties = {
    position: 'absolute',
    borderRadius: 10,
    border: '1px solid var(--im-selection-stroke, rgba(110, 200, 255, 0.95))',
    boxShadow: '0 0 0 3px var(--im-selection-shadow, rgba(110, 200, 255, 0.12))',
    pointerEvents: 'none',
  };

  const renderRotatedBox = (n: (typeof selectedNodes)[number]) => {
    const cam = ctx.getCamera();
    const zoom = cam.zoom || 1;
    const w = n.width * zoom;
    const h = n.height * zoom;
    const centerWorld = { x: n.x + n.width / 2, y: n.y + n.height / 2 };
    const centerScreen = ctx.worldToScreen(centerWorld);

    const rz = n.rotation ?? 0;
    const rx = n.rotationX ?? 0;
    const ry = n.rotationY ?? 0;

    const wrapperStyle: CSSProperties = {
      position: 'absolute',
      left: centerScreen.x,
      top: centerScreen.y,
      width: w,
      height: h,
      transform: `translate(-50%, -50%) perspective(${VISUAL_CONST.perspectivePx}px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${rz}deg)`,
      transformOrigin: '50% 50%',
      transformStyle: 'preserve-3d',
      pointerEvents: 'none',
    };

    return (
      <div key={n.id} style={wrapperStyle}>
        <div style={{ ...boxStyle, inset: 0 }} />
      </div>
    );
  };

  const handleSize = 8;
  const handleStyle: CSSProperties = {
    position: 'absolute',
    width: handleSize,
    height: handleSize,
    borderRadius: 3,
    background: 'var(--im-handle-fill, #ffffff)',
    border: '1px solid var(--im-handle-stroke, rgba(110, 200, 255, 0.95))',
    boxShadow: 'none',
    pointerEvents: 'auto',
    touchAction: 'none',
    // 统一用 transform 居中，避免 margin/transform 双重偏移
    transform: 'translate(-50%, -50%)',
  };

  const rotateHandleSize = 10;
  const rotateStyle: CSSProperties = {
    position: 'absolute',
    width: rotateHandleSize,
    height: rotateHandleSize,
    borderRadius: 999,
    background: 'var(--im-handle-fill, #ffffff)',
    border: '1px solid var(--im-handle-stroke, rgba(110, 200, 255, 0.95))',
    pointerEvents: 'auto',
    touchAction: 'none',
    cursor: 'grab',
    // 统一用 transform 居中，避免 margin/transform 双重偏移
    transform: 'translate(-50%, -50%)',
  };

  const groupRotateHandle =
    ids.length > 1 &&
    (() => {
      const pts = selectedNodes.flatMap((n) => {
        const p0 = ctx.worldToScreen({ x: n.x, y: n.y });
        const p1 = ctx.worldToScreen({ x: n.x + n.width, y: n.y + n.height });
        const left = Math.min(p0.x, p1.x);
        const top = Math.min(p0.y, p1.y);
        const right = Math.max(p0.x, p1.x);
        const bottom = Math.max(p0.y, p1.y);
        return [
          { x: left, y: top },
          { x: right, y: top },
          { x: left, y: bottom },
          { x: right, y: bottom },
        ];
      });
      if (pts.length === 0) return null;
      const minX = Math.min(...pts.map((p) => p.x));
      const maxX = Math.max(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const cx = (minX + maxX) / 2;
      const y = minY - 18;
      return (
        <div
          data-rotate-handle="1"
          data-rotate-scope="group"
          style={{ ...rotateStyle, left: cx, top: y }}
          aria-hidden="true"
        />
      );
    })();

  // 单选：渲染 8 个缩放指示点（角+边中点）
  const single = ids.length === 1 ? nodes.find((n) => n.id === ids[0]) : null;
  const rotatedSingle =
    single &&
    (() => {
      const cam = ctx.getCamera();
      const zoom = cam.zoom || 1;
      const w = single.width * zoom;
      const h = single.height * zoom;

      const centerWorld = { x: single.x + single.width / 2, y: single.y + single.height / 2 };
      const centerScreen = ctx.worldToScreen(centerWorld);

      const deg = single.rotation ?? 0;
      const rx = single.rotationX ?? 0;
      const ry = single.rotationY ?? 0;

      const wrapperStyle: CSSProperties = {
        position: 'absolute',
        left: centerScreen.x,
        top: centerScreen.y,
        width: w,
        height: h,
        transform: `translate(-50%, -50%) perspective(${VISUAL_CONST.perspectivePx}px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${deg}deg)`,
        transformOrigin: '50% 50%',
        transformStyle: 'preserve-3d',
        pointerEvents: 'auto',
      };

      const borderStyle: CSSProperties = {
        position: 'absolute',
        inset: 0,
        borderRadius: 10,
        border: '1px solid var(--im-selection-stroke, rgba(110, 200, 255, 0.95))',
        boxShadow: '0 0 0 3px var(--im-selection-shadow, rgba(110, 200, 255, 0.12))',
        pointerEvents: 'none',
      };

      const cursorByKey: Record<string, string> = {
        nw: 'nwse-resize',
        se: 'nwse-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize',
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize',
      };

      const handleDefs = [
        { k: 'nw', left: '0%', top: '0%' },
        { k: 'n', left: '50%', top: '0%' },
        { k: 'ne', left: '100%', top: '0%' },
        { k: 'e', left: '100%', top: '50%' },
        { k: 'se', left: '100%', top: '100%' },
        { k: 's', left: '50%', top: '100%' },
        { k: 'sw', left: '0%', top: '100%' },
        { k: 'w', left: '0%', top: '50%' },
      ] as const;

      // 旋转 handle：放在顶部中点上方（跟随旋转）
      const rotateHandle = (
        <div
          data-rotate-handle="1"
          data-nodeid={single.id}
          style={{
            ...rotateStyle,
            left: '50%',
            top: 0,
            // 基于顶部中点向上偏移（不再叠加 -50% 的额外偏移）
            transform: `translate(-50%, -22px)`,
          }}
          aria-hidden="true"
        />
      );

      return (
        <div style={wrapperStyle}>
          <div style={borderStyle} />
          {handleDefs.map((hdef) => (
            <div
              key={hdef.k}
              data-handle={hdef.k}
              data-nodeid={single.id}
              style={{
                ...handleStyle,
                left: hdef.left,
                top: hdef.top,
                cursor: cursorByKey[hdef.k],
              }}
              aria-hidden="true"
            />
          ))}
          {rotateHandle}
        </div>
      );
    })();

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        // 初始 transform（后续会被 engine subscribe 直接写入）
        transform: dragDxPx || dragDyPx ? `translate3d(${dragDxPx}px, ${dragDyPx}px, 0)` : undefined,
        willChange: dragDxPx || dragDyPx ? 'transform' : undefined,
      }}
    >
      {single ? rotatedSingle : selectedNodes.map((n) => renderRotatedBox(n))}
      {groupRotateHandle ?? null}
    </div>
  );
}
