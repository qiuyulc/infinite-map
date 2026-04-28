import { useCallback, useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { Camera, NodeData } from '../core/types';
import { VISUAL_CONST } from '../editor/keys';
import { DefaultNode } from './DefaultNode';

export function RenderDomNodes({
  cameraRef,
  visibleNodes,
  zIndex = 1,
  onNodeDrag,
  renderNode,
  renderNodeContent,
  getDefaultNodeProps,
  defaultNodeShowMeta,
}: {
  cameraRef: React.MutableRefObject<Camera>;
  visibleNodes: NodeData[];
  zIndex?: number;
  onNodeDrag?: (id: string, pos: { x: number; y: number }, phase: 'move' | 'end') => void;
  renderNode?: (node: NodeData) => ReactNode;
  renderNodeContent?: (node: NodeData) => ReactNode;
  getDefaultNodeProps?: (node: NodeData) => { className?: string; style?: CSSProperties };
  defaultNodeShowMeta?: boolean;
}) {
  const dragRef = useRef<{
    active: boolean;
    id: string;
    startPx: number;
    startPy: number;
    startX: number;
    startY: number;
  } | null>(null);

  const onNodePointerDown = useCallback(
    (e: ReactPointerEvent, n: NodeData) => {
      if (!onNodeDrag) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        active: true,
        id: n.id,
        startPx: e.clientX,
        startPy: e.clientY,
        startX: n.x,
        startY: n.y,
      };
    },
    [onNodeDrag]
  );

  const onNodePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current;
      if (!d?.active || !onNodeDrag) return;
      e.stopPropagation();
      if ((e.buttons & 1) === 0) return;
      const zoom = cameraRef.current.zoom || 1;
      const dx = (e.clientX - d.startPx) / zoom;
      const dy = (e.clientY - d.startPy) / zoom;
      onNodeDrag(d.id, { x: d.startX + dx, y: d.startY + dy }, 'move');
    },
    [onNodeDrag, cameraRef]
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current;
      if (!d?.active || !onNodeDrag) return;
      e.stopPropagation();
      d.active = false;
      const zoom = cameraRef.current.zoom || 1;
      const dx = (e.clientX - d.startPx) / zoom;
      const dy = (e.clientY - d.startPy) / zoom;
      onNodeDrag(d.id, { x: d.startX + dx, y: d.startY + dy }, 'end');
      dragRef.current = null;
    },
    [onNodeDrag, cameraRef]
  );

  // DOM 模式下：把节点 elements 记忆化，避免每次 camera 更新都创建/比对几百个子元素导致卡顿
  const domNodeElements = useMemo(() => {
    return visibleNodes.map((n) => (
      <div
        key={n.id}
        data-im-node-id={n.id}
        style={{
          position: 'absolute',
          left: n.x,
          top: n.y,
          width: n.width,
          height: n.height,
          transformOrigin: '50% 50%',
          transform:
            n.rotation || n.rotationX || n.rotationY
              ? `perspective(${VISUAL_CONST.perspectivePx}px) rotateX(${n.rotationX ?? 0}deg) rotateY(${n.rotationY ?? 0}deg) rotate(${n.rotation ?? 0}deg)`
              : undefined,
          // 隔离布局/样式，保留阴影等外溢绘制（避免 paint containment 裁剪 box-shadow）
          contain: 'layout style',
          touchAction: 'none',
          cursor: onNodeDrag ? 'grab' : 'default',
        }}
        onPointerDown={onNodeDrag ? (e) => onNodePointerDown(e, n) : undefined}
        onPointerMove={onNodeDrag ? onNodePointerMove : undefined}
        onPointerUp={onNodeDrag ? endDrag : undefined}
        onPointerCancel={onNodeDrag ? endDrag : undefined}
      >
        {renderNode ? (
          renderNode(n)
        ) : (
          <DefaultNode
            n={n}
            className={getDefaultNodeProps?.(n)?.className}
            style={getDefaultNodeProps?.(n)?.style}
            showMeta={defaultNodeShowMeta}
          >
            {renderNodeContent ? renderNodeContent(n) : null}
          </DefaultNode>
        )}
      </div>
    ));
  }, [visibleNodes, renderNode, renderNodeContent, getDefaultNodeProps, defaultNodeShowMeta, onNodeDrag, onNodePointerDown, onNodePointerMove, endDrag]);

  const worldStyle: CSSProperties = useMemo(() => {
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      transformOrigin: '0 0',
      width: 0,
      height: 0,
      zIndex,
    };
  }, [zIndex]);

  return (
    <div style={worldStyle}>
      {domNodeElements}
    </div>
  );
}
