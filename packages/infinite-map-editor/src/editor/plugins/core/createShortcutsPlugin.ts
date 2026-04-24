import type { InfiniteMapPlugin, MapContext, MapKeyEvent } from '../../types';

type ShortcutAction = { commandId: string };

export type ShortcutsPluginOptions = {
  /**
   * keymap：规范化后的字符串
   * - 例："Mod+Z"、"Mod+Shift+Z"
   */
  keymap?: Record<string, ShortcutAction>;
  /**
   * 以 commandId 为维度覆盖快捷键（更适合业务方配置）
   * - string：设置/覆盖为该快捷键
   * - null：禁用该命令的默认快捷键（会移除所有指向该命令的默认 key）
   */
  commandShortcuts?: Record<string, string | null>;
};

function isMacPlatform() {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

function normalizeKey(e: MapKeyEvent) {
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const parts: string[] = [];
  if (e.modifiers.shift) parts.push('Shift');
  if (e.modifiers.alt) parts.push('Alt');
  const mac = isMacPlatform();
  const mod = mac ? e.modifiers.meta : e.modifiers.ctrl;
  if (mod) parts.push('Mod');
  parts.push(key);
  return parts.join('+');
}

const DEFAULT_KEYMAP: Record<string, ShortcutAction> = {
  'Mod+Z': { commandId: 'history.undo' },
  'Shift+Mod+Z': { commandId: 'history.redo' },
  'Mod+C': { commandId: 'edit.copy' },
  'Mod+V': { commandId: 'edit.paste' },
  'Mod+X': { commandId: 'edit.cut' },
  'Mod+D': { commandId: 'edit.duplicate' },
  'Mod+G': { commandId: 'edit.group' },
  'Shift+Mod+G': { commandId: 'edit.ungroup' },
  Backspace: { commandId: 'edit.delete' },
  Delete: { commandId: 'edit.delete' },
};

export function createShortcutsPlugin(opts: ShortcutsPluginOptions = {}): InfiniteMapPlugin {
  // 以 keymap 为基础（允许用户直接写 normalizeKey 的 key 字符串）
  const keymap: Record<string, ShortcutAction> = { ...DEFAULT_KEYMAP, ...(opts.keymap ?? {}) };

  // commandShortcuts：先移除旧映射，再添加新映射
  const overrides = opts.commandShortcuts ?? {};
  for (const [commandId, key] of Object.entries(overrides)) {
    // remove all keys pointing to this command
    for (const k of Object.keys(keymap)) {
      if (keymap[k]?.commandId === commandId) delete keymap[k];
    }
    if (typeof key === 'string' && key.trim()) keymap[key.trim()] = { commandId };
  }

  return {
    id: 'shortcuts',
    provides: ['shortcuts'],
    requires: ['commands'],
    handlers: {
      onKeyDown: (e: MapKeyEvent, ctx: MapContext) => {
        const k = normalizeKey(e);
        const hit = keymap[k];
        if (!hit) return { handled: false };
        if (ctx.runCommand) ctx.runCommand(hit.commandId, { source: 'keyboard' });
        else ctx.bus.emit('command:run', { id: hit.commandId, source: 'keyboard' });
        return { handled: true };
      },
    },
  };
}

