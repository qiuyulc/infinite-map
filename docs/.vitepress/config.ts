import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: 'Infinite Map',
  description: '一个可扩展的无限画布/节点编辑器内核（React + 插件化）',

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '架构', link: '/architecture/overview' },
      { text: '深入理解', link: '/deep-dive/view-and-zoom' },
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
          text: '按功能讲实现',
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
