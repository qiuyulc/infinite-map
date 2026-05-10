import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Infinite Map',
  description: '一个可扩展的无限画布组件库：渲染、编辑器插件、Patch 变更流与持久化。',

  themeConfig: {
    nav: [
      { text: '使用手册', link: '/library/quickstart' },
      { text: '全量功能清单', link: '/功能清单与对外API' },
    ],
    sidebar: {
      '/library/': [
        {
          text: '入门',
          items: [
            { text: '快速上手', link: '/library/quickstart' },
            { text: 'Demo 与本地测试面板', link: '/library/demos' },
            { text: '常见问题', link: '/library/faq' },
          ],
        },
        {
          text: '核心概念',
          items: [
            { text: 'NodeData 节点数据', link: '/library/node-data' },
            { text: '组件 API（InfiniteMap）', link: '/library/component-api' },
            { text: 'InfiniteMapApi 参考', link: '/library/api-ref' },
          ],
        },
        {
          text: '编辑器',
          items: [
            { text: '插件配置', link: '/library/plugin-config' },
            { text: '编辑与变更流（onPatches）', link: '/library/editing' },
            { text: '命令速查表', link: '/library/commands' },
            { text: '操作与快捷键', link: '/library/shortcuts-and-operations' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '视图控制（铺满/居中/锁定）', link: '/library/view' },
            { text: '保存/加载（Doc & Resources）', link: '/library/persistence' },
            { text: '主题定制', link: '/library/theming' },
            { text: '多人协作接入', link: '/library/collaboration' },
          ],
        },
        {
          text: '开发与贡献',
          items: [
            { text: '项目目录结构', link: '/library/project-structure' },
          ],
        },
      ],
    },
    search: { provider: 'local' }
  }
});
