import { defineConfig } from 'rspress/config';

export default defineConfig({
  root: 'docs',
  title: 'Infinite Map',
  description: '一个可扩展的无限画布组件库：渲染、编辑器插件、Patch 变更流与持久化。',
  icon: '/img/logo.png',
  logo: {
    light: '/img/logo.png',
    dark: '/img/logo.png',
  },
  logoText: "Infinite Map",
  base: '/infinite-map/',
  lang: 'zh-CN',
  locales: [],
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/qiuyulc/infinite-map',
      },
    ],
    nav: [
      {
        text: '文档',
        link: '/editor/quickstart',
        activeMatch: '^/(editor|library|infinite-map|功能清单|releasing)',
      },
      {
        text: 'GitHub',
        link: 'https://github.com/qiuyulc/infinite-map',
      },
    ],
    sidebar: {
      '/': [
        {
          text: '首页',
          link: '/',
        },
        {
          text: '编辑器使用指南',
          collapsed: false,
          items: [
            { text: '快速上手', link: '/editor/quickstart' },
            { text: '插件配置', link: '/editor/plugin-config' },
            { text: '快捷键与操作', link: '/editor/shortcuts-and-operations' },
            { text: '编辑功能', link: '/editor/editing' },
            { text: '视图操作', link: '/library/view' },
            { text: '持久化', link: '/library/persistence' },
            { text: '主题', link: '/library/theming' },
            { text: '协作', link: '/library/collaboration' },
          ],
        },
        {
          text: 'API 参考',
          collapsed: true,
          items: [
            { text: '节点数据', link: '/library/node-data' },
            { text: '组件 API', link: '/library/component-api' },
            { text: 'API 参考', link: '/library/api-ref' },
            { text: '全量功能清单', link: '/功能清单与对外API' },
          ],
        },
        {
          text: '架构与开发',
          collapsed: true,
          items: [
            {
              text: 'infinite-map 核心引擎',
              collapsed: true,
              items: [
                { text: '概览', link: '/infinite-map/overview' },
                { text: '核心类型', link: '/infinite-map/01-core-types' },
                { text: 'Engine Store', link: '/infinite-map/02-engine-store' },
                { text: '插件协议', link: '/infinite-map/03-plugin-protocol' },
                { text: '渲染管线', link: '/infinite-map/04-render-pipeline' },
                { text: '输入管线', link: '/infinite-map/05-input-pipeline' },
                { text: 'Patch 引擎', link: '/infinite-map/06-patch-engine' },
                { text: '相机与视口', link: '/infinite-map/07-camera-viewport' },
                { text: '虚拟化', link: '/infinite-map/08-virtualization' },
                { text: '主题系统', link: '/infinite-map/09-theme-system' },
                { text: '文档序列化', link: '/infinite-map/10-doc-serialization' },
              ],
            },
            {
              text: 'editor 插件开发',
              collapsed: true,
              items: [
                { text: '概览', link: '/editor/overview' },
                { text: '插件开发', link: '/editor/plugin-development' },
                { text: '插件参考', link: '/editor/plugin-reference' },
                { text: '自定义', link: '/editor/customization' },
              ],
            },
            { text: '项目结构', link: '/library/project-structure' },
          ],
        },
        {
          text: '附录',
          collapsed: true,
          items: [
            { text: '发布流程', link: '/releasing' },
            { text: '示例', link: '/library/demos' },
            { text: 'FAQ', link: '/library/faq' },
          ],
        },
      ],
    },
    footer: {
      message: 'Built with Rspress',
    },
    editLink: {
      docRepoBaseUrl: 'https://github.com/qiuyulc/infinite-map/edit/main/site/docs',
      text: '编辑此页',
    },
  },
  globalStyles: 'src/css/custom.css',
  markdown: {
    showLineNumbers: true,
  },
});