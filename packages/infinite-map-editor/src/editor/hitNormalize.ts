import type { NodeData } from '@qiuyulc/infinite-map';
import { buildById, getAncestorChain, isGroupNode } from './groupUtils';

/**
 * 将命中 id 规范化为"更符合编辑器直觉"的有效 id。
 *
 * 策略：沿祖先链找最外层 group
 * - 有 group → 返回最外层 group id（单击子节点 = 选中父 group）
 * - 无 group → 返回自身
 */
export function normalizeHitIdForSelectedGroups(opts: {
  nodes: NodeData[];
  hitId: string;
  selectedIds: string[];
  modifiers: { alt: boolean };
}): string {
  const { nodes, hitId } = opts;

  const byId = buildById(nodes);
  const chain = getAncestorChain(byId, hitId);

  // 找最外层祖先 group；没有则返回自身
  let outermost: string | null = null;
  for (const gid of chain) {
    const gn = byId.get(gid);
    if (gn && isGroupNode(gn)) outermost = gid;
  }
  return outermost ?? hitId;
}
