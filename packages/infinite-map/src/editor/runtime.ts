import type { NodeData, Rect } from '../core/types';
import type { EventBus, EventKey, EventMap, NodePatch, Store, Unsubscribe } from './types';

export function createEventBus(): EventBus {
  const listeners = new Map<EventKey, Set<(payload: unknown) => void>>();

  const on = <K extends EventKey>(type: K, handler: (payload: EventMap[K]) => void): Unsubscribe => {
    let set = listeners.get(type);
    if (!set) {
      set = new Set();
      listeners.set(type, set);
    }
    set.add(handler as unknown as (payload: unknown) => void);
    return () => set?.delete(handler as unknown as (payload: unknown) => void);
  };

  const emit = <K extends EventKey>(type: K, payload: EventMap[K]) => {
    const set = listeners.get(type);
    if (!set || set.size === 0) return;
    // 拷贝一份防止 handler 内部取消订阅影响遍历
    [...set].forEach((fn) => fn(payload as unknown));
  };

  return { on, emit };
}

export function createStore(): Store {
  const data = new Map<string, unknown>();
  const subs = new Map<string, Set<() => void>>();

  const get = <T = unknown>(key: string): T | undefined => data.get(key) as T | undefined;

  const set = <T = unknown>(key: string, value: T) => {
    data.set(key, value);
    const set = subs.get(key);
    if (!set || set.size === 0) return;
    [...set].forEach((fn) => fn());
  };

  const subscribe = (key: string, listener: () => void): Unsubscribe => {
    let set = subs.get(key);
    if (!set) {
      set = new Set();
      subs.set(key, set);
    }
    set.add(listener);
    return () => set?.delete(listener);
  };

  return { get, set, subscribe };
}

export function applyPatchesToNodes(nodes: NodeData[], patches: NodePatch[]): NodeData[] {
  if (patches.length === 0) return nodes;
  let out = nodes;

  for (const p of patches) {
    switch (p.type) {
      case 'move': {
        out = out.map((n) => (n.id === p.id ? { ...n, x: p.x, y: p.y } : n));
        break;
      }
      case 'set': {
        out = out.map((n) => (n.id === p.id ? { ...n, ...p.data } : n));
        break;
      }
      case 'add': {
        // 默认追加到末尾；如需插入顺序可在后续扩展 patch
        out = [...out, p.node];
        break;
      }
      case 'remove': {
        out = out.filter((n) => n.id !== p.id);
        break;
      }
    }
  }

  return out;
}

export function rectFromWorldView(camera: { x: number; y: number; zoom: number }, viewport: { w: number; h: number }): Rect {
  const z = camera.zoom || 1;
  return { x: camera.x - viewport.w / (2 * z), y: camera.y - viewport.h / (2 * z), w: viewport.w / z, h: viewport.h / z };
}
