import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { STORE_KEYS, VISUAL_CONST, type MapContext, type NodeData } from '@qiuyulc/infinite-map';

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

  // 注意：不能在这里开始调用 hooks（useEffect/useRef），因为上面有多个 early-return。
  // 否则 selection 从空 -> 非空 会导致 hooks 调用顺序变化，从而触发 React internal error。
  const resizeState = ctx.store.get<any>(STORE_KEYS.resizeState);
  // 关键：当 selection 切换时，强制 remount 内层组件，清理掉上一轮 pan 跟随留下的 imperative DOM 状态，
  // 避免出现“拖动画布后再选中其它节点，选框/resize handle 仍带着旧坐标系偏移”的错位问题。
  return <SelectionOverlayInner key={ids.join(',')} ctx={ctx} ids={ids} nodes={nodes} selectedNodes={selectedNodes} resizeState={resizeState} />;
}

function SelectionOverlayInner({
  ctx,
  ids,
  nodes,
  selectedNodes,
  resizeState,
}: {
  ctx: MapContext;
  ids: string[];
  nodes: NodeData[];
  selectedNodes: NodeData[];
  resizeState: any;
}) {

  // Engine 模式下：
  // - 节点拖拽 move：只改 DOM（数据不变）=> 选中框需要跟随拖拽位移
  // - 地图拖拽（pan）：cameraRef 在变，但 overlay 不一定重渲染 => 选中框需要跟随 camera 变化
  const engine = ctx.getService<{ store: any }>('engine');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const drag = ctx.store.get<any>(STORE_KEYS.dragState);
  let dragDxWorld = 0;
  let dragDyWorld = 0;
  if (drag?.startById && drag?.lastById) {
    const anyId: string | undefined = drag.primaryId ?? drag.ids?.[0];
    const s = anyId ? drag.startById[anyId] : null;
    const l = anyId ? drag.lastById[anyId] : null;
    if (s && l) {
      dragDxWorld = l.x - s.x;
      dragDyWorld = l.y - s.y;
    }
  }
  dragOffsetRef.current.x = dragDxWorld;
  dragOffsetRef.current.y = dragDyWorld;

  // 每次 render 后 reset inner 的 drag translate（避免 React 复用 DOM 导致遗留 transform）
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const x = dragOffsetRef.current.x;
    const y = dragOffsetRef.current.y;
    el.style.transform = x || y ? `translate3d(${x}px, ${y}px, 0)` : '';
    el.style.willChange = x || y ? 'transform' : '';
  });

  // 订阅 view 变化：
  // - 直接把 root 变换设置为 engine.view.transform（与节点层同一套 transform），避免缩放时“慢半拍”
  // - 用 CSS 变量维护 zoom 的倒数，用于把 handle 大小保持为固定屏幕像素
  useEffect(() => {
    if (!engine?.store) return;
    const root = rootRef.current;
    const inner = innerRef.current;
    if (!root || !inner) return;

    const applyView = (v?: any) => {
      const view = v ?? engine.store.getState().view;
      const z = (view.zoom || 1) as number;
      // 与 viewport DOM 同步：同一帧写入同一份 transform
      root.style.transform = view.transform;
      root.style.willChange = 'transform';
      // 用于固定屏幕像素尺寸
      root.style.setProperty('--im-zoom', String(z));
      root.style.setProperty('--im-zoom-inv', String(1 / z));
      // drag translate（world 单位）
      const dx = dragOffsetRef.current.x;
      const dy = dragOffsetRef.current.y;
      inner.style.transform = dx || dy ? `translate3d(${dx}px, ${dy}px, 0)` : '';
      inner.style.willChange = dx || dy ? 'transform' : '';
    };

    // init
    applyView();

    const unView = engine.store.subscribe(
      (s: any) => s.view,
      (v: any) => {
        applyView(v);
      },
      { equalityFn: () => false }
    );

    const unDrag = ctx.store.subscribe(STORE_KEYS.dragState, () => {
      // update drag offsets and apply once（不依赖 React re-render）
      const drag = ctx.store.get<any>(STORE_KEYS.dragState);
      let dx = 0;
      let dy = 0;
      if (drag?.startById && drag?.lastById) {
        const anyId: string | undefined = drag.primaryId ?? drag.ids?.[0];
        const s = anyId ? drag.startById[anyId] : null;
        const l = anyId ? drag.lastById[anyId] : null;
        if (s && l) {
          dx = l.x - s.x;
          dy = l.y - s.y;
        }
      }
      dragOffsetRef.current.x = dx;
      dragOffsetRef.current.y = dy;
      applyView();
    });

    return () => {
      unView?.();
      unDrag?.();
    };
  }, [ctx, engine]);

  const boxStyle: CSSProperties = {
    position: 'absolute',
    borderRadius: 10,
    // 让边框宽度保持为“固定屏幕像素”
    border: 'calc(1px * var(--im-zoom-inv, 1)) solid var(--im-selection-stroke, rgba(110, 200, 255, 0.95))',
    boxShadow: '0 0 0 calc(3px * var(--im-zoom-inv, 1)) var(--im-selection-shadow, rgba(110, 200, 255, 0.12))',
    pointerEvents: 'none',
  };

  const renderRotatedBox = (n: (typeof selectedNodes)[number]) => {
    const w = n.width;
    const h = n.height;
    const cx = n.x + n.width / 2;
    const cy = n.y + n.height / 2;
    const rz = n.rotation ?? 0;
    const rx = n.rotationX ?? 0;
    const ry = n.rotationY ?? 0;

    const wrapperStyle: CSSProperties = {
      position: 'absolute',
      left: cx,
      top: cy,
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
    width: `calc(${handleSize}px * var(--im-zoom-inv, 1))`,
    height: `calc(${handleSize}px * var(--im-zoom-inv, 1))`,
    borderRadius: `calc(3px * var(--im-zoom-inv, 1))`,
    background: 'var(--im-handle-fill, #ffffff)',
    border: 'calc(1px * var(--im-zoom-inv, 1)) solid var(--im-handle-stroke, rgba(110, 200, 255, 0.95))',
    boxShadow: 'none',
    pointerEvents: 'auto',
    touchAction: 'none',
    // 统一用 transform 居中，避免 margin/transform 双重偏移
    transform: 'translate(-50%, -50%)',
  };

  const rotateHandleSize = 10;
  const rotateStyle: CSSProperties = {
    position: 'absolute',
    width: `calc(${rotateHandleSize}px * var(--im-zoom-inv, 1))`,
    height: `calc(${rotateHandleSize}px * var(--im-zoom-inv, 1))`,
    borderRadius: `calc(999px * var(--im-zoom-inv, 1))`,
    background: 'var(--im-handle-fill, #ffffff)',
    border: 'calc(1px * var(--im-zoom-inv, 1)) solid var(--im-handle-stroke, rgba(110, 200, 255, 0.95))',
    pointerEvents: 'auto',
    touchAction: 'none',
    cursor: 'grab',
    // 统一用 transform 居中，避免 margin/transform 双重偏移
    transform: 'translate(-50%, -50%)',
  };

  const groupRotateHandle =
    ids.length > 1 &&
    (() => {
      if (selectedNodes.length === 0) return null;
      const minX = Math.min(...selectedNodes.map((n) => n.x));
      const maxX = Math.max(...selectedNodes.map((n) => n.x + n.width));
      const minY = Math.min(...selectedNodes.map((n) => n.y));
      const cx = (minX + maxX) / 2;
      return (
        <div
          data-rotate-handle="1"
          data-rotate-scope="group"
          style={{
            ...rotateStyle,
            left: cx,
            top: `calc(${minY}px - 18px * var(--im-zoom-inv, 1))`,
          }}
          aria-hidden="true"
        />
      );
    })();

  // 单选：渲染 8 个缩放指示点（角+边中点）
  const single0 = ids.length === 1 ? nodes.find((n) => n.id === ids[0]) : null;
  const single =
    single0 && resizeState?.id === single0.id && resizeState?.lastRect
      ? ({
          ...single0,
          x: resizeState.lastRect.x,
          y: resizeState.lastRect.y,
          width: resizeState.lastRect.w,
          height: resizeState.lastRect.h,
        } as typeof single0)
      : single0;
  const rotatedSingle =
    single &&
    (() => {
      const w = single.width;
      const h = single.height;
      const cx = single.x + single.width / 2;
      const cy = single.y + single.height / 2;

      const deg = single.rotation ?? 0;
      const rx = single.rotationX ?? 0;
      const ry = single.rotationY ?? 0;

      const wrapperStyle: CSSProperties = {
        position: 'absolute',
        left: cx,
        top: cy,
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
        border: 'calc(1px * var(--im-zoom-inv, 1)) solid var(--im-selection-stroke, rgba(110, 200, 255, 0.95))',
        boxShadow: '0 0 0 calc(3px * var(--im-zoom-inv, 1)) var(--im-selection-shadow, rgba(110, 200, 255, 0.12))',
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
            transform: `translate(-50%, calc(-22px * var(--im-zoom-inv, 1)))`,
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
        transformOrigin: '0 0',
        // transform 与 zoom 变量由订阅逻辑同步写入（避免缩放时慢半拍）
      }}
    >
      <div ref={innerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {single ? rotatedSingle : selectedNodes.map((n) => renderRotatedBox(n))}
        {groupRotateHandle ?? null}
      </div>
    </div>
  );
}
