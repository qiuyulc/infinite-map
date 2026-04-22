import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Infinite Map 文档（重写）',
  description: '面向零基础：从能跑起来到能改功能；并提供从0重写路线图',

  themeConfig: {
    nav: [
      { text: '从0重写', link: '/rewrite/00-blueprint' }
    ],
    sidebar: {
      '/rewrite/': [
        {
          text: '从 0 重写（面试亮点路线）',
          items: [
            { text: '00. 总蓝图（你要做什么）', link: '/rewrite/00-blueprint' },
            { text: '01. 项目结构与分层', link: '/rewrite/01-project-structure' },
            { text: '02. 核心数据模型（Node/Camera/Patch）', link: '/rewrite/02-core-models' },
            { text: '03. 渲染层（DOM + Canvas + 叠层）', link: '/rewrite/03-rendering' },
            { text: '04. Editor Runtime（插件装配）', link: '/rewrite/04-editor-runtime' },
            { text: '05. 插件协议与扩展点', link: '/rewrite/05-plugin-contract' },
            { text: '06. 功能路线图（按模块实现）', link: '/rewrite/06-feature-roadmap' },
            { text: '10. Milestone 0：只渲染 nodes', link: '/rewrite/10-m0-render-nodes' },
            { text: '11. Milestone 1：Camera（缩放 + 平移）', link: '/rewrite/11-m1-camera-zoom-pan' },
            { text: '12. Milestone 2：选中 + 拖拽节点（引入最小插件系统）', link: '/rewrite/12-m2-selection-and-drag' },
            { text: '07. 如何把它讲成面试亮点', link: '/rewrite/07-interview-story' }
          ]
        }
      ]
    },
    search: { provider: 'local' }
  }
});
