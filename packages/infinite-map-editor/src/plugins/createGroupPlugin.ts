import { createElement, type ReactNode } from 'react';
import {
  STORE_KEYS,
  applyPatchesToNodes,
  type ChangeMeta,
  type Command,
  type InfiniteMapPlugin,
  type MapContext,
  type NodeData,
  type NodePatch,
} from '@qiuyulc/infinite-map';
import {
  DEFAULT_GROUP_PADDING,
  buildById,
  computeBBox,
  expandIdsWithGroups,
  getAncestorChain,
  getDescendantIds,
  isGroupNode,
} from '../editor/groupUtils';
import type { ToolbarItem } from './createToolbarPlugin';
import type { ContextMenuItem } from './createDefaultContextMenuPlugin';

const Icon = ({ children }: { children?: ReactNode }) =>
  createElement(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': 'true' },
    children
  );

const Icons = {
  group: createElement(
    Icon,
    {},
    createElement('rect', { x: 3, y: 3, width: 8, height: 8, rx: 2 }),
    createElement('rect', { x: 13, y: 13, width: 8, height: 8, rx: 2 }),
    createElement('path', { d: 'M11 7h2a4 4 0 0 1 4 4v2' })
  ),
  ungroup: createElement(
    Icon,
    {},
    createElement('rect', { x: 3, y: 3, width: 8, height: 8, rx: 2 }),
    createElement('rect', { x: 13, y: 13, width: 8, height: 8, rx: 2 }),
    createElement('path', { d: 'M11 7h2' }),
    createElement('path', { d: 'M17 13v-2' })
  ),
} as const;

function genGroupId() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSelectionService(ctx: MapContext) {
  return ctx.getService<{ getIds: () => string[]; setIds: (ids: string[]) => void; clear: () => void }>('selection');
}

function getDocumentService(ctx: MapContext) {
  return ctx.getService<{ applyPatches: (patches: NodePatch[], meta: ChangeMeta) => void }>('document');
}

function getHudService(ctx: MapContext) {
  return ctx.getService<{
    addToolbarItems: (items: ToolbarItem[]) => void;
    addContextMenuItems: (items: ContextMenuItem[]) => void;
  }>('hud');
}

function computeGroupRectFromNodes(nodes: NodeData[]) {
  const b = computeBBox(nodes);
  const p = DEFAULT_GROUP_PADDING;
  return { x: b.x - p, y: b.y - p, w: b.w + p * 2, h: b.h + p * 2 };
}

/**
 * 编组插件（库级）
 * - commands：edit.group / edit.ungroup
 * - service：group（展开 ids / 查询后代 / 组 bbox）
 * - 自动同步：子节点移动/缩放后，自动更新 group 节点 bbox（通过 patches:applied 监听）
 */
export function createGroupPlugin(): InfiniteMapPlugin {
  const cmdGroup: Command = {
    id: 'edit.group',
    title: 'Group',
    shortcut: 'Mod+G',
    run: (ctx) => {
      const sel = getSelectionService(ctx);
      const doc = getDocumentService(ctx);
      const ids = sel?.getIds?.() ?? [];
      if (!doc || ids.length < 2) return;

      const byId = buildById(ctx.getNodes());
      const picked = ids.map((id) => byId.get(id)).filter(Boolean) as NodeData[];
      if (picked.length < 2) return;

      const rect = computeGroupRectFromNodes(picked);
      const minZ = Math.min(...picked.map((n) => n.z ?? 0));

      const groupId = genGroupId();
      const groupNode: NodeData = {
        id: groupId,
        kind: 'group',
        x: rect.x,
        y: rect.y,
        width: rect.w,
        height: rect.h,
        z: minZ - 1,
        label: 'Group',
      };

      const patches: NodePatch[] = [
        { type: 'add', node: groupNode },
        ...picked.map(
          (n): NodePatch => ({
            type: 'set',
            id: n.id,
            data: { parentId: groupId } as Partial<NodeData>,
          })
        ),
      ];

      doc.applyPatches(patches, { source: 'plugin', plugin: 'group', reason: 'group', phase: 'end', ids });
      sel?.setIds?.([groupId]);
      ctx.bus.emit('selection:change', { ids: [groupId] });
      ctx.requestRender();
    },
  };

  const cmdUngroup: Command = {
    id: 'edit.ungroup',
    title: 'Ungroup',
    shortcut: 'Shift+Mod+G',
    run: (ctx) => {
      const sel = getSelectionService(ctx);
      const doc = getDocumentService(ctx);
      const ids = sel?.getIds?.() ?? [];
      if (!doc || ids.length !== 1) return;
      const groupId = ids[0];
      const byId = buildById(ctx.getNodes());
      const g = byId.get(groupId);
      if (!g || !isGroupNode(g)) return;

      const children = ctx.getNodes().filter((n) => n.parentId === groupId);
      const patches: NodePatch[] = [
        ...children.map((n): NodePatch => ({ type: 'set', id: n.id, data: { parentId: undefined } as Partial<NodeData> })),
        { type: 'remove', id: groupId } as const,
      ];
      doc.applyPatches(patches, { source: 'plugin', plugin: 'group', reason: 'ungroup', phase: 'end', ids: [groupId] });

      const nextSel = children.map((n) => n.id);
      sel?.setIds?.(nextSel);
      ctx.bus.emit('selection:change', { ids: nextSel });
      ctx.requestRender();
    },
  };

  return {
    id: 'group',
    provides: ['group'],
    commands: {
      [cmdGroup.id]: cmdGroup,
      [cmdUngroup.id]: cmdUngroup,
    },
    setup: (ctx: MapContext) => {
      // service：供 drag/resize/rotate/clipboard 等插件使用
      ctx.registerService('group', {
        isGroupId: (id: string) => {
          const n = ctx.getNodes().find((x) => x.id === id);
          return Boolean(n && isGroupNode(n));
        },
        getDescendantIds: (groupId: string) => getDescendantIds(ctx.getNodes(), groupId),
        expandIds: (ids: string[]) => expandIdsWithGroups(ctx.getNodes(), ids),
      });

      // HUD 贡献：右键菜单与 toolbar 增加 group/ungroup
      const hud = getHudService(ctx);
      hud?.addToolbarItems([
        { type: 'divider' },
        {
          type: 'command',
          id: 'edit.group',
          label: 'Group',
          title: '编组（Mod+G）',
          icon: Icons.group,
          enabled: (ctx2) => {
            const ids = getSelectionService(ctx2)?.getIds?.() ?? [];
            return ids.length >= 2;
          },
        },
        {
          type: 'command',
          id: 'edit.ungroup',
          label: 'Ungroup',
          title: '解除编组（Shift+Mod+G）',
          icon: Icons.ungroup,
          enabled: (ctx2) => {
            const ids = getSelectionService(ctx2)?.getIds?.() ?? [];
            if (ids.length !== 1) return false;
            const n = ctx2.getNodes().find((x) => x.id === ids[0]);
            return Boolean(n && isGroupNode(n));
          },
        },
      ]);

      hud?.addContextMenuItems([
        { type: 'divider' },
        { type: 'command', id: 'edit.group', label: '编组', icon: Icons.group, enabled: (ctx2) => (getSelectionService(ctx2)?.getIds?.() ?? []).length >= 2 },
        {
          type: 'command',
          id: 'edit.ungroup',
          label: '解除编组',
          icon: Icons.ungroup,
          enabled: (ctx2) => {
            const ids = getSelectionService(ctx2)?.getIds?.() ?? [];
            if (ids.length !== 1) return false;
            const n = ctx2.getNodes().find((x) => x.id === ids[0]);
            return Boolean(n && isGroupNode(n));
          },
        },
      ]);

      // 自动同步 group bbox：当成员节点变化后，更新 group 节点框
      ctx.bus.on('patches:applied', ({ patches, meta, beforeById }) => {
        if (meta.plugin === 'group' && meta.reason === 'group-sync') return;

        const beforeNodes = ctx.getNodes();
        const nextNodes = applyPatchesToNodes(beforeNodes, patches);

        const byIdBefore = buildById(beforeNodes);
        const byIdNext = buildById(nextNodes);

        const touchedGroupIds = new Set<string>();

        for (const p of patches) {
          if (p.type === 'remove') {
            const before = beforeById[p.id] ?? byIdBefore.get(p.id);
            if (!before) continue;
            // 被删除节点的父链上的 group 都可能需要更新
            const chain = getAncestorChain(byIdBefore, p.id);
            for (const gid of chain) {
              const gn = byIdBefore.get(gid);
              if (gn && isGroupNode(gn)) touchedGroupIds.add(gid);
            }
            continue;
          }
          const id = p.type === 'add' ? p.node.id : p.id;
          const node = byIdNext.get(id);
          if (!node) continue;
          const chain = getAncestorChain(byIdNext, id);
          for (const gid of chain) {
            const gn = byIdNext.get(gid);
            if (gn && isGroupNode(gn)) touchedGroupIds.add(gid);
          }
        }

        if (touchedGroupIds.size === 0) return;

        const doc = getDocumentService(ctx);
        if (!doc) return;

        const syncPatches: NodePatch[] = [];
        for (const gid of touchedGroupIds) {
          const g = byIdNext.get(gid);
          if (!g || !isGroupNode(g)) continue;
          const descIds = getDescendantIds(nextNodes, gid);
          const members = descIds.map((id) => byIdNext.get(id)).filter(Boolean) as NodeData[];
          if (members.length === 0) continue;
          const rect = computeGroupRectFromNodes(members);
          if (g.x !== rect.x || g.y !== rect.y || g.width !== rect.w || g.height !== rect.h) {
            syncPatches.push({ type: 'set', id: gid, data: { x: rect.x, y: rect.y, width: rect.w, height: rect.h } });
          }
        }

        if (syncPatches.length) {
          doc.applyPatches(syncPatches, {
            source: 'plugin',
            plugin: 'group',
            reason: 'group-sync',
            phase: meta.phase,
            ids: [...touchedGroupIds],
          });
        }
      });

      // registry 初始值（保证 store key 存在，方便 HUD 判断刷新）
      if (!ctx.store.get(STORE_KEYS.toolbarItems)) ctx.store.set(STORE_KEYS.toolbarItems, []);
      if (!ctx.store.get(STORE_KEYS.contextMenuItems)) ctx.store.set(STORE_KEYS.contextMenuItems, []);
    },
  };
}
