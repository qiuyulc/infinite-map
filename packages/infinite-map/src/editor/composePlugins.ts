import type { InfiniteMapPlugin } from './types';

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

type Graph = Map<string, Set<string>>;

/**
 * 组合插件（推荐在应用层调用）
 * - 校验重复 id
 * - 校验 requires/provides
 * - 按 order.after/before 拓扑排序（稳定：保持输入顺序）
 */
export function composePlugins(input: InfiniteMapPlugin[]): InfiniteMapPlugin[] {
  const plugins = input.filter((p) => p.enabled !== false);
  const orderIndex = new Map<string, number>();
  plugins.forEach((p, i) => orderIndex.set(p.id, i));

  const byId = new Map<string, InfiniteMapPlugin>();
  for (const p of plugins) {
    if (byId.has(p.id)) throw new Error(`[composePlugins] duplicate plugin id: ${p.id}`);
    byId.set(p.id, p);
  }

  // provides 集合（每个插件默认提供自己的 id）
  const provides = new Map<string, string>(); // capability -> provider plugin id
  for (const p of plugins) {
    const caps = uniq([p.id, ...(p.provides ?? [])]);
    for (const c of caps) {
      if (!provides.has(c)) provides.set(c, p.id);
    }
  }

  // requires 校验
  for (const p of plugins) {
    for (const r of p.requires ?? []) {
      const ok = byId.has(r) || provides.has(r);
      if (!ok) throw new Error(`[composePlugins] plugin "${p.id}" requires missing capability/plugin: "${r}"`);
    }
  }

  // 构建排序图（edge: a -> b 表示 a 在 b 之前）
  const g: Graph = new Map();
  const indeg = new Map<string, number>();
  for (const p of plugins) {
    g.set(p.id, new Set());
    indeg.set(p.id, 0);
  }

  const addEdge = (a: string, b: string) => {
    if (!g.has(a) || !g.has(b)) return;
    const s = g.get(a)!;
    if (s.has(b)) return;
    s.add(b);
    indeg.set(b, (indeg.get(b) ?? 0) + 1);
  };

  for (const p of plugins) {
    for (const b of p.order?.before ?? []) addEdge(p.id, b);
    for (const a of p.order?.after ?? []) addEdge(a, p.id);
  }

  // topo sort（稳定：保持输入顺序）
  const q: string[] = [];
  for (const [id, d] of indeg.entries()) if (d === 0) q.push(id);
  q.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));

  const out: InfiniteMapPlugin[] = [];
  while (q.length) {
    const id = q.shift()!;
    out.push(byId.get(id)!);
    for (const nxt of g.get(id) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if (indeg.get(nxt) === 0) {
        q.push(nxt);
        q.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
      }
    }
  }

  if (out.length !== plugins.length) throw new Error('[composePlugins] plugin order has cycle');
  return out;
}

