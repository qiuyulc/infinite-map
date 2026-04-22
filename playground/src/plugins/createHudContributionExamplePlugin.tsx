import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map';

type HudService = {
  addToolbarItems: (items: any[]) => void;
  addContextMenuItems: (items: any[]) => void;
};

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
 * Demo 插件：演示如何通过 hud registry 给 Toolbar/右键菜单“贡献”一个 item
 * - 只用于 playground，不属于库的默认能力
 */
export function createHudContributionExamplePlugin(): InfiniteMapPlugin {
  return {
    id: 'demo-hud-contrib',
    requires: ['hud'],
    commands: {
      'demo.hello': {
        id: 'demo.hello',
        title: 'Hello（示例）',
        run: (_ctx: any) => {
          // eslint-disable-next-line no-alert
          if (typeof window !== 'undefined' && window.alert) window.alert('Hello from HUD registry demo plugin!');
          else console.log('[demo.hello] Hello from HUD registry demo plugin!');
        },
      },
    },
    setup: (ctx) => {
      // hud service 是库提供的扩展点（本 demo 只需要用到 addToolbarItems/addContextMenuItems）
      // 注意：如果你的 ctx 是 any（例如在 JS 文件里写插件），直接写 ctx.getService<...>() 会报：
      // “非类型化函数调用不能接受类型参数”
      // 用类型断言更稳妥。
      const hud = ctx.getService('hud') as HudService | undefined;

      hud?.addToolbarItems([
        { type: 'divider' },
        {
          type: 'command',
          id: 'demo.hello',
          label: 'Hello',
          title: '示例：通过 registry 注入的按钮',
          icon: icon(),
          iconOnly: true,
        },
      ]);

      hud?.addContextMenuItems([
        { type: 'divider' },
        {
          type: 'command',
          id: 'demo.hello',
          label: 'Hello（示例）',
          icon: icon(),
        },
      ]);
    },
  };
}
