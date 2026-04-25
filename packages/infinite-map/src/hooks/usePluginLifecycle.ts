import { useEffect } from 'react';
import type { EditorErrorInfo, InfiniteMapPlugin, MapContext } from '../editor/types';

export function usePluginLifecycle({
  plugins,
  ctx,
  onEditorErrorRef,
}: {
  plugins?: InfiniteMapPlugin[];
  ctx: MapContext;
  onEditorErrorRef: React.MutableRefObject<((err: unknown, info: EditorErrorInfo) => void) | undefined>;
}) {
  useEffect(() => {
    if (!plugins || plugins.length === 0) return;
    plugins.forEach((p) => {
      if (p.enabled === false) return;
      try {
        p.setup?.(ctx);
      } catch (err) {
        onEditorErrorRef.current?.(err, { kind: 'lifecycle', name: 'setup', pluginId: p.id });
      }
    });
    return () => {
      plugins.forEach((p) => {
        if (p.enabled === false) return;
        try {
          p.teardown?.();
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'lifecycle', name: 'teardown', pluginId: p.id });
        }
      });
    };
  }, [plugins, ctx, onEditorErrorRef]);
}

