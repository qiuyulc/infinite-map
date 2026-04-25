import { useEffect } from 'react';
import type { Command, InfiniteMapPlugin } from '../editor/types';

export type CommandRegistryOptions = {
  plugins?: InfiniteMapPlugin[];
  store: { set: (key: string, value: any) => void };
  commandConflictPolicy: 'keep-first' | 'override' | 'error';
  warnOnCommandConflict: boolean;
};

/**
 * 将 plugins.commands 汇总到 store：
 * - commands:registry：Record<commandId, Command>
 * - commands:from：Record<commandId, pluginId>
 */
export function useCommandRegistry({ plugins, store, commandConflictPolicy, warnOnCommandConflict }: CommandRegistryOptions) {
  useEffect(() => {
    if (!plugins || plugins.length === 0) {
      store.set('commands:registry', {});
      store.set('commands:from', {});
      return;
    }

    const registry: Record<string, Command> = {};
    const from: Record<string, string> = {};

    for (const p of plugins) {
      if (p.enabled === false) continue;
      const cmds = p.commands ?? {};
      for (const [id, cmd] of Object.entries(cmds)) {
        if (!registry[id]) {
          registry[id] = cmd;
          from[id] = p.id;
          continue;
        }

        // 冲突处理
        const prevPlugin = from[id] ?? 'unknown';
        const nextPlugin = p.id;
        const msg = `[InfiniteMap] command 冲突：${id} 来自 ${prevPlugin} 与 ${nextPlugin}`;

        // 作为三方库：不要依赖 Vite 的 import.meta.env 类型；也避免直接引用全局 process（浏览器/tsconfig 可能没 node types）
        const nodeEnv = (globalThis as any)?.process?.env?.NODE_ENV as string | undefined;
        const isDev = nodeEnv != null ? nodeEnv !== 'production' : false;
        const shouldWarn = Boolean(warnOnCommandConflict) && isDev;

        if (commandConflictPolicy === 'error') {
          if (shouldWarn) console.error(msg);
          throw new Error(msg);
        }
        if (commandConflictPolicy === 'override') {
          if (shouldWarn) console.warn(msg + '（已覆盖）');
          registry[id] = cmd;
          from[id] = nextPlugin;
        } else {
          if (shouldWarn) console.warn(msg + '（已忽略）');
          // keep-first：忽略后者
        }
      }
    }

    store.set('commands:registry', registry);
    store.set('commands:from', from);
  }, [plugins, store, commandConflictPolicy, warnOnCommandConflict]);
}

