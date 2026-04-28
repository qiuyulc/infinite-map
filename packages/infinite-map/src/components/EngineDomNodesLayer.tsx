import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Camera, NodeData } from '../core/types';
import type { EngineStore } from '../engine';
import { useEngineSelector } from '../engine';
import { RenderDomNodes } from './RenderDomNodes';

const shallowEqualArray = (a: string[], b: string[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

type Props = {
  store: EngineStore;
  nodesById: Map<string, NodeData>;
  cameraRef: React.MutableRefObject<Camera>;
  zIndex?: number;
  onNodeDrag?: (id: string, pos: { x: number; y: number }, phase: 'move' | 'end') => void;
  renderNode?: (node: NodeData) => ReactNode;
  renderNodeContent?: (node: NodeData) => ReactNode;
  getDefaultNodeProps?: (node: NodeData) => { className?: string; style?: CSSProperties };
  defaultNodeShowMeta?: boolean;
};

/**
 * 引擎节点层（React 只订阅 visibleNodeIds）
 * - camera/pan 变化不会触发该组件更新
 * - 仅当 ids 增减时才会 re-render
 */
export const EngineDomNodesLayer = memo(function EngineDomNodesLayer({
  store,
  nodesById,
  cameraRef,
  zIndex = 1,
  onNodeDrag,
  renderNode,
  renderNodeContent,
  getDefaultNodeProps,
  defaultNodeShowMeta,
}: Props) {
  const visibleIds = useEngineSelector(store, (s) => s.visibleNodeIds, shallowEqualArray);

  const visibleNodes = useMemo(() => {
    const out: NodeData[] = [];
    for (const id of visibleIds) {
      const n = nodesById.get(id);
      if (n) out.push(n);
    }
    return out;
  }, [nodesById, visibleIds]);

  // 该 camera 仅用于满足 RenderDomNodes 的类型；transform 已由外层 viewport DOM 负责
  const dummyCamera: Camera = { x: 0, y: 0, zoom: 1 };

  return (
    <RenderDomNodes
      camera={dummyCamera}
      cameraRef={cameraRef}
      visibleNodes={visibleNodes}
      applyCameraTransform={false}
      zIndex={zIndex}
      onNodeDrag={onNodeDrag}
      renderNode={renderNode}
      renderNodeContent={renderNodeContent}
      getDefaultNodeProps={getDefaultNodeProps}
      defaultNodeShowMeta={defaultNodeShowMeta}
    />
  );
});

