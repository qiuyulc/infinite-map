import type { NodeData } from '@qiuyulc/infinite-map';
import { buildById, getAncestorChain, isGroupNode } from './groupUtils';

/**
 * 将命中 id 规范化为“更符合编辑器直觉”的有效 id。
 *
 * 目前只做一条策略：
 * - 若命中的是“已选中 group 的后代”，并且未按 Alt，则把命中视为该 group（便于直接拖动整组/右键整组）
 *
 * 说明：
 * - 这是“交互偏好策略”，后续如需开放给宿主配置，可将策略参数化
 */
export function normalizeHitIdForSelectedGroups(opts: {
  nodes: NodeData[];
  hitId: string;
  selectedIds: string[];
  modifiers: { alt: boolean };
}): string {
  const { nodes, hitId, selectedIds, modifiers } = opts;
  if (modifiers.alt) return hitId;
  if (selectedIds.length === 0) return hitId;

  const selectedSet = new Set(selectedIds);
  const byId = buildById(nodes);
  const chain = getAncestorChain(byId, hitId);
  for (const gid of chain) {
    if (!selectedSet.has(gid)) continue;
    const gn = byId.get(gid);
    if (gn && isGroupNode(gn)) return gid;
  }
  return hitId;
}
