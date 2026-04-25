import type { ReactNode } from 'react';
import type { EditorErrorInfo, InfiniteMapPlugin, MapContext } from '../editor/types';
import { OverlayErrorBoundary } from './OverlayErrorBoundary';

export function RenderPluginOverlays({
  plugins,
  slot,
  ctx,
  zIndex,
  onEditorError,
}: {
  plugins?: InfiniteMapPlugin[];
  slot: 'background' | 'overlay' | 'hud';
  ctx: MapContext;
  zIndex: number;
  onEditorError?: (err: unknown, info: EditorErrorInfo) => void;
}): ReactNode {
  if (!plugins || plugins.length === 0) return null;

  const list = plugins.filter((p) => p.enabled !== false && (slot === 'overlay' ? p.slot === undefined || p.slot === 'overlay' : p.slot === slot));
  if (list.length === 0) return null;

  // 重要：
  // - 父层默认 pointerEvents:none，避免“透明大层”成为事件 target
  // - 需要交互的 overlay/hud 由各插件 wrapper 设置 overlayPointerEvents:'auto'
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex }}>
      {list.map((p) => {
        const Overlay = p.overlay;
        return (
          <div key={p.id} data-plugin={p.id} style={{ pointerEvents: p.overlayPointerEvents ?? 'none' }}>
            {Overlay ? (
              <OverlayErrorBoundary info={{ pluginId: p.id, slot }} onError={onEditorError}>
                <Overlay ctx={ctx} />
              </OverlayErrorBoundary>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
