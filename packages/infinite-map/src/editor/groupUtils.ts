import type { NodeData } from '../core/types';

export const DEFAULT_GROUP_PADDING = 18;

export function isGroupNode(n: NodeData) {
  return n.kind === 'group';
}

export function buildById(nodes: NodeData[]) {
  return new Map(nodes.map((n) => [n.id, n] as const));
}

export function getChildren(nodes: NodeData[], groupId: string) {
  return nodes.filter((n) => n.parentId === groupId);
}

export function getDescendantIds(nodes: NodeData[], groupId: string) {
  const out: string[] = [];
  const q: string[] = [groupId];
  while (q.length) {
    const cur = q.pop()!;
    for (const n of nodes) {
      if (n.parentId === cur) {
        out.push(n.id);
        if (isGroupNode(n)) q.push(n.id);
      }
    }
  }
  return out;
}

export function getAncestorChain(byId: Map<string, NodeData>, nodeId: string) {
  const out: string[] = [];
  let cur = byId.get(nodeId);
  while (cur?.parentId) {
    out.push(cur.parentId);
    cur = byId.get(cur.parentId);
  }
  return out;
}

export function isLockedEffective(nodes: NodeData[], nodeId: string) {
  const byId = buildById(nodes);
  let cur = byId.get(nodeId);
  while (cur) {
    if (cur.locked) return true;
    if (!cur.parentId) return false;
    cur = byId.get(cur.parentId);
  }
  return false;
}

export function isHiddenEffective(nodes: NodeData[], nodeId: string) {
  const byId = buildById(nodes);
  let cur = byId.get(nodeId);
  while (cur) {
    if (cur.hidden) return true;
    if (!cur.parentId) return false;
    cur = byId.get(cur.parentId);
  }
  return false;
}

export function computeBBox(nodes: NodeData[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

/**
 * 展开 ids：
 * - 如果选中 group，则会加入所有后代节点 id（递归）
 * - 会去重
 */
export function expandIdsWithGroups(nodes: NodeData[], ids: string[]) {
  const byId = buildById(nodes);
  const out = new Set<string>();
  for (const id of ids) {
    out.add(id);
    const n = byId.get(id);
    if (n && isGroupNode(n)) {
      for (const d of getDescendantIds(nodes, id)) out.add(d);
    }
  }
  return [...out];
}
