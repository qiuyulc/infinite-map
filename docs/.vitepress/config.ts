import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Infinite Map 文档',
  description: '面向零基础：从0重写一遍（带里程碑与代码注释）',

  themeConfig: {
    nav: [
      { text: '从0重写', link: '/rewrite/00-blueprint' },
      { text: '库使用', link: '/library/api' },
      { text: '功能与API（全量）', link: '/功能清单与对外API' },
    ],
    sidebar: {
      '/rewrite/': [
        {
          text: '从 0 重写（路线 + 里程碑）',
          items: [
            { text: '00. 总蓝图（你要做什么）', link: '/rewrite/00-blueprint' },
            { text: '01. 项目结构与分层', link: '/rewrite/01-project-structure' },
            { text: '02. 核心数据模型（Node/Camera/Patch）', link: '/rewrite/02-core-models' },
            { text: '03. 渲染层（DOM + Canvas + 叠层）', link: '/rewrite/03-rendering' },
            { text: '04. Editor Runtime（插件装配）', link: '/rewrite/04-editor-runtime' },
            { text: '05. 插件协议与扩展点', link: '/rewrite/05-plugin-contract' },
            { text: '06. 功能路线图（按模块实现）', link: '/rewrite/06-feature-roadmap' },
            { text: '30. 代码地图（目录/文件职责）', link: '/rewrite/30-code-map' },
            { text: '31. 注释版：InfiniteMap.tsx', link: '/rewrite/31-annotated-infinite-map' },
            { text: '32. 注释版：editor/runtime.ts', link: '/rewrite/32-annotated-editor-runtime' },
            { text: '33. 注释版：默认插件集合', link: '/rewrite/33-annotated-default-plugins' },
            { text: '07. 如何把它讲成面试亮点', link: '/rewrite/07-interview-story' }
          ]
        }
      ],
      '/library/': [
        {
          text: '作为三方库使用',
          items: [
            { text: 'API 总览（入门）', link: '/library/api' },
            { text: '插件开发指南', link: '/library/plugin-dev' },
            { text: 'Doc schema 与迁移', link: '/library/doc-schema' },
          ],
        },
      ],
    },
    search: { provider: 'local' }
  }
});
