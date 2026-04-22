import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: 'Infinite Map',
  description: '一个可扩展的无限画布/节点编辑器内核（React + 插件化）',

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '从0到1', link: '/zero-to-one/00-reading-map' },
      { text: '架构', link: '/architecture/overview' },
      { text: '进阶理解', link: '/deep-dive/view-and-zoom' },
      { text: 'API', link: '/api/public-api' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '功能清单', link: '/guide/features' },
            { text: '代码结构导航', link: '/guide/code-structure' }
          ]
        }
      ],
      '/zero-to-one/': [
        {
          text: '从 0 到 1（面向零基础）',
          items: [
            { text: '00. 阅读地图（先看哪里）', link: '/zero-to-one/00-reading-map' },
            { text: '01. 跑起来：playground 做了什么', link: '/zero-to-one/01-run-and-playground' },
            { text: '02. InfiniteMap：画布是怎么画出来的', link: '/zero-to-one/02-infinite-map' },
            { text: '03. Editor：编辑能力从哪里来（plugins）', link: '/zero-to-one/03-editor-plugins' },
            { text: '04. 自己加一个功能（新增 HUD 插件示例）', link: '/zero-to-one/04-add-your-first-plugin' }
          ]
        }
      ],
      '/architecture/': [
        {
          text: '架构',
          items: [
            { text: '总览', link: '/architecture/overview' },
            { text: '核心渲染与数据流', link: '/architecture/rendering-and-dataflow' },
            { text: 'Editor 运行时', link: '/architecture/editor-runtime' },
            { text: '插件系统', link: '/architecture/plugin-system' },
            { text: '命令与快捷键', link: '/architecture/commands-and-shortcuts' }
          ]
        }
      ],
      '/deep-dive/': [
        {
          text: '进阶：按功能讲实现',
          items: [
            { text: '视图/相机/缩放', link: '/deep-dive/view-and-zoom' },
            { text: '插件与命令系统', link: '/deep-dive/plugins-and-commands' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API',
          items: [
            { text: '公开导出总览', link: '/api/public-api' },
            { text: 'Theme / CSS Variables', link: '/api/theme' },
            { text: 'Editor 插件（默认集合）', link: '/api/editor-plugins' }
          ]
        }
      ]
    },

    search: { provider: 'local' }
  }
});
