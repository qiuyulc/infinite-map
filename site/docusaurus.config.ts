import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Infinite Map',
  tagline: '一个可扩展的无限画布组件库：渲染、编辑器插件、Patch 变更流与持久化。',
  url: 'https://qiuyulc.github.io',
  baseUrl: '/infinite-map/',
  favicon: 'img/favicon.ico',

  organizationName: 'qiuyulc',
  projectName: 'infinite-map',

  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.ts'),
          editUrl: 'https://github.com/qiuyulc/infinite-map/edit/main/site/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themes: [
    '@docusaurus/theme-live-codeblock',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      { language: ['zh', 'en'] },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Infinite Map',
      items: [
        {
          to: '/infinite-map-editor/quickstart',
          label: '文档',
          position: 'left',
        },
        // {
        //   to: '/功能清单与对外API',
        //   label: '全量功能清单',
        //   position: 'left',
        // },
        {
          href: 'https://github.com/qiuyulc/infinite-map',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            { label: '快速上手', to: '/infinite-map-editor/quickstart' },
            { label: 'API 参考', to: '/library/component-api' },
          ],
        },
        {
          title: '社区',
          items: [
            { label: 'GitHub', href: 'https://github.com/qiuyulc/infinite-map' },
            { label: 'npm', href: 'https://www.npmjs.com/package/@qiuyulc/infinite-map' },
          ],
        },
      ],
      copyright: `Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
