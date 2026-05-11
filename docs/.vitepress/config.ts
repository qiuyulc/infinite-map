import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Infinite Map',
  description: '一个可扩展的无限画布组件库：渲染、编辑器插件、Patch 变更流与持久化。',

  themeConfig: {
    nav: [
      { text: '文档', link: '/infinite-map-editor/quickstart' },
      { text: '全量功能清单', link: '/功能清单与对外API' },
    ],
    sidebar: {
      '/': [
        {
          text: 'infinite-map-editor 使用',
          collapsed: false,
          items: [
            { text: '快速上手', link: '/infinite-map-editor/quickstart' },
            { text: '插件配置', link: '/infinite-map-editor/plugin-config' },
            { text: '操作与快捷键', link: '/infinite-map-editor/shortcuts-and-operations' },
            { text: '编辑与变更流 (onPatches)', link: '/infinite-map-editor/editing' },
            { text: '视图控制', link: '/library/view' },
            { text: '保存/加载', link: '/library/persistence' },
            { text: '主题定制', link: '/library/theming' },
            { text: '多人协作接入', link: '/library/collaboration' },
          ],
        },
        {
          text: 'API 参考',
          collapsed: true,
          items: [
            { text: 'NodeData 节点数据', link: '/library/node-data' },
            { text: 'InfiniteMap 组件 API', link: '/library/component-api' },
            { text: 'InfiniteMapApi 参考', link: '/library/api-ref' },
            { text: '全量功能清单', link: '/功能清单与对外API' },
          ],
        },
        {
          text: '架构与开发',
          collapsed: true,
          items: [
            {
              text: 'infinite-map 核心引擎',
              items: [
                { text: '架构总览', link: '/infinite-map/overview' },
                { text: '1. 核心类型 & 几何', link: '/infinite-map/01-core-types' },
                { text: '2. Engine Store', link: '/infinite-map/02-engine-store' },
                { text: '3. 插件协议', link: '/infinite-map/03-plugin-protocol' },
                { text: '4. 渲染管线', link: '/infinite-map/04-render-pipeline' },
                { text: '5. 输入管线', link: '/infinite-map/05-input-pipeline' },
                { text: '6. Patch 引擎', link: '/infinite-map/06-patch-engine' },
                { text: '7. 坐标 & Camera', link: '/infinite-map/07-camera-viewport' },
                { text: '8. 虚拟化', link: '/infinite-map/08-virtualization' },
                { text: '9. 主题系统', link: '/infinite-map/09-theme-system' },
                { text: '10. Doc 序列化', link: '/infinite-map/10-doc-serialization' },
              ],
            },
            {
              text: 'infinite-map-editor 插件开发',
              items: [
                { text: '架构总览', link: '/infinite-map-editor/overview' },
                { text: '插件开发指南', link: '/infinite-map-editor/plugin-development' },
                { text: '插件 API 参考 (24 插件)', link: '/infinite-map-editor/plugin-reference' },
                { text: '编辑器定制', link: '/infinite-map-editor/customization' },
              ],
            },
            { text: '项目目录结构', link: '/library/project-structure' },
          ],
        },
        {
          text: '附录',
          collapsed: true,
          items: [
            { text: '发布指南', link: '/releasing' },
            { text: 'Demo 与本地测试面板', link: '/library/demos' },
            { text: '常见问题', link: '/library/faq' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
  },
});
