import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Infinite Map 文档（重写）',
  description: '面向零基础：从能跑起来到能改功能',

  themeConfig: {
    nav: [{ text: '从0到1', link: '/start/00-what-you-see' }],
    sidebar: {
      '/start/': [
        {
          text: '从 0 到 1（零基础）',
          items: [
            { text: '00. 你在页面上看到了什么？', link: '/start/00-what-you-see' },
            { text: '01. nodes 是什么？怎么渲染出来？', link: '/start/01-nodes-and-render' },
            { text: '02. 插件是什么？为什么功能不写在一个文件里？', link: '/start/02-plugins' },
            { text: '03. 我如何修改一个功能？（示例：右键菜单）', link: '/start/03-edit-a-feature' }
          ]
        }
      ]
    },
    search: { provider: 'local' }
  }
});

