import { useCallback } from 'react';
import type { Command, EditorErrorInfo, MapContext } from '../editor/types';

export type RunCommandPayload = { source: 'keyboard' | 'toolbar' | 'menu' | 'api'; [k: string]: unknown };

export type RunCommandWithHooksOptions = {
  ctxRef: React.MutableRefObject<MapContext | null>;
  hooksRef: React.MutableRefObject<
    | {
        onBeforeCommand?: (id: string, info: { source: RunCommandPayload['source']; payload?: unknown }) => boolean | void;
        onAfterCommand?: (id: string, info: { ok: boolean; source: RunCommandPayload['source']; payload?: unknown }) => void;
        [k: string]: unknown;
      }
    | null
    | undefined
  >;
  hookModeRef: React.MutableRefObject<'intercept' | 'observe'>;
  onEditorErrorRef: React.MutableRefObject<((err: unknown, info: EditorErrorInfo) => void) | undefined>;
};

export function useRunCommandWithHooks({ ctxRef, hooksRef, hookModeRef, onEditorErrorRef }: RunCommandWithHooksOptions) {
  return useCallback(
    (id: string, payload?: RunCommandPayload) => {
      const ctx0 = ctxRef.current;
      if (!ctx0) return false;
      const source = (payload?.source ?? 'api') as RunCommandPayload['source'];

      const before = hooksRef.current?.onBeforeCommand;
      if (before) {
        try {
          const ok = before(id, { source, payload });
          if (hookModeRef.current === 'intercept' && ok === false) return false;
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onBeforeCommand', commandId: id, source });
        }
      }

      const reg = ctx0.store.get<Record<string, Command>>('commands:registry') ?? {};
      const cmdFrom = ctx0.store.get<Record<string, string>>('commands:from') ?? {};
      const cmd = reg[id];
      if (!cmd) {
        try {
          hooksRef.current?.onAfterCommand?.(id, { ok: false, source, payload });
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onAfterCommand', commandId: id, source });
        }
        return false;
      }
      try {
        cmd.run(ctx0, { source });
        try {
          hooksRef.current?.onAfterCommand?.(id, { ok: true, source, payload });
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onAfterCommand', commandId: id, source });
        }
        return true;
      } catch (err) {
        onEditorErrorRef.current?.(err, { kind: 'command', name: 'run', commandId: id, source, pluginId: cmdFrom[id] });
        try {
          hooksRef.current?.onAfterCommand?.(id, { ok: false, source, payload });
        } catch (e2) {
          onEditorErrorRef.current?.(e2, { kind: 'hook', name: 'onAfterCommand', commandId: id, source });
        }
        return false;
      }
    },
    [ctxRef, hookModeRef, hooksRef, onEditorErrorRef]
  );
}
