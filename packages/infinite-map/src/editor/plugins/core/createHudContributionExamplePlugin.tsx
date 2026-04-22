import React from 'react';
import type { Command, InfiniteMapPlugin, MapContext } from '../../types';
import type { ToolbarItem } from '../hud/createToolbarPlugin';
import type { ContextMenuItem } from '../hud/createDefaultContextMenuPlugin';

function icon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2v6" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l4.24 4.24" />
      <path d="M14.83 14.83l4.24 4.24" />
      <path d="M2 12h6" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l4.24-4.24" />
      <path d="M14.83 9.17l4.24-4.24" />
    </svg>
  );
}

/**
 * 示例插件：演示如何通过 hud registry 给 Toolbar/右键菜单“贡献”一个 item
 * - 不会默认加入 createDefaultEditorPlugins
 * - 建议仅在 playground 或文档示例中使用
 */
export function createHudContributionExamplePlugin(): InfiniteMapPlugin {
  const helloCommand: Command = {
    id: 'demo.hello',
    title: 'Hello（示例）',
    run: (_ctx: MapContext) => {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.alert) window.alert('Hello from HUD registry plugin!');
      else console.log('[demo.hello] Hello from HUD registry plugin!');
    },
  };

  return {
    id: 'demo-hud-contrib',
    requires: ['hud'],
    commands: {
      [helloCommand.id]: helloCommand,
    },
    setup: (ctx) => {
      const hud = ctx.getService<{
        addToolbarItems: (items: ToolbarItem[]) => void;
        addContextMenuItems: (items: ContextMenuItem[]) => void;
      }>('hud');

      // 贡献一个 toolbar 按钮
      hud?.addToolbarItems([
        { type: 'divider' },
        {
          type: 'command',
          id: helloCommand.id,
          label: 'Hello',
          title: '示例：通过 registry 注入的按钮',
          icon: icon(),
          iconOnly: true,
        },
      ]);

      // 贡献一个右键菜单项
      hud?.addContextMenuItems([
        { type: 'divider' },
        {
          type: 'command',
          id: helloCommand.id,
          label: 'Hello（示例）',
          icon: icon(),
        },
      ]);
    },
  };
}

