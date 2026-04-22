import type { CSSProperties } from 'react';
import type { MapContext } from '../types';
import { STORE_KEYS, VISUAL_CONST } from '../keys';

const STORE_KEY = STORE_KEYS.selectionIds;

export function SelectionOverlay({ ctx }: { ctx: MapContext }) {
  const ids = ctx.store.get<string[]>(STORE_KEY) ?? [];
  if (ids.length === 0) return null;

  const nodes = ctx.getNodes();
  const selected = new Set(ids);

  const selectedNodes = nodes.filter((n) => selected.has(n.id));

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
        pointerEvents: 'none',
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
    <>
      {single
        ? rotatedSingle
        : selectedNodes.map((n) => renderRotatedBox(n))}
      {groupRotateHandle ?? null}
    </>
  );
}
