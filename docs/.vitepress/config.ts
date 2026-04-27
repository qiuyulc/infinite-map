import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Infinite Map',
  description: '一个可扩展的无限画布组件库：渲染、编辑器插件、Patch 变更流与持久化。',

  themeConfig: {
    nav: [
      { text: '使用手册', link: '/library/quickstart' },
      { text: '组件 API', link: '/library/component-api' },
      { text: '全量功能清单', link: '/功能清单与对外API' },
    ],
    sidebar: {
      '/library/': [
        {
          text: '作为三方库使用',
          items: [
            { text: '快速上手', link: '/library/quickstart' },
            { text: '组件 API', link: '/library/component-api' },
            { text: '编辑与变更流（onPatches）', link: '/library/editing' },
            { text: '视图控制（铺满/居中/锁定）', link: '/library/view' },
            { text: '保存/加载（Doc & Resources）', link: '/library/persistence' },
            { text: '多人协作接入（业务侧）', link: '/library/collaboration' },
            { text: 'Demo 与本地测试面板', link: '/library/demos' },
            { text: '命令速查表', link: '/library/commands' },
            { text: '常见问题', link: '/library/faq' },
          ],
        },
      ],
    },
    search: { provider: 'local' }
  }
});
