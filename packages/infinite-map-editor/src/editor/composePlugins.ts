import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map';

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

type Graph = Map<string, Set<string>>;

/**
 * 组合插件（推荐在应用层调用）
 * - 校验重复 id
 * - 校验 requires/provides
 * - 自动根据 requires/provides/order 生成依赖边，并做拓扑排序
 * - 同一层级按 priority（高优先级在前）+ 输入顺序稳定排序
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

  const providerOf = (capOrPluginId: string): string | null => {
    if (byId.has(capOrPluginId)) return capOrPluginId;
    return provides.get(capOrPluginId) ?? null;
  };

  // requires => provider must come before consumer
  for (const p of plugins) {
    for (const r of p.requires ?? []) {
      const prov = providerOf(r);
      if (!prov) continue;
      if (prov === p.id) continue;
      addEdge(prov, p.id);
    }
  }

  for (const p of plugins) {
    for (const b of p.order?.before ?? []) addEdge(p.id, b);
    for (const a of p.order?.after ?? []) addEdge(a, p.id);
  }

  const sortKey = (id: string) => {
    const p = byId.get(id);
    return { pr: p?.priority ?? 0, idx: orderIndex.get(id) ?? 0 };
  };

  const sortQ = (arr: string[]) =>
    arr.sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      if (ka.pr !== kb.pr) return kb.pr - ka.pr; // priority desc
      return ka.idx - kb.idx; // stable input order
    });

  // topo sort（同层按 priority + 输入顺序）
  const q: string[] = [];
  for (const [id, d] of indeg.entries()) if (d === 0) q.push(id);
  sortQ(q);

  const out: InfiniteMapPlugin[] = [];
  while (q.length) {
    const id = q.shift()!;
    out.push(byId.get(id)!);
    for (const nxt of g.get(id) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if (indeg.get(nxt) === 0) {
        q.push(nxt);
        sortQ(q);
      }
    }
  }

  if (out.length !== plugins.length) throw new Error('[composePlugins] plugin order has cycle');
  return out;
}
