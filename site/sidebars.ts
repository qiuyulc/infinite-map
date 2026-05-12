import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'category',
      label: 'infinite-map-editor 使用',
      collapsed: false,
      items: [
        'infinite-map-editor/quickstart',
        'infinite-map-editor/plugin-config',
        'infinite-map-editor/shortcuts-and-operations',
        'infinite-map-editor/editing',
        'library/view',
        'library/persistence',
        'library/theming',
        'library/collaboration',
      ],
    },
    {
      type: 'category',
      label: 'API 参考',
      collapsed: true,
      items: [
        'library/node-data',
        'library/component-api',
        'library/api-ref',
        '功能清单与对外API',
      ],
    },
    {
      type: 'category',
      label: '架构与开发',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'infinite-map 核心引擎',
          items: [
            'infinite-map/overview',
            'infinite-map/core-types',
            'infinite-map/engine-store',
            'infinite-map/plugin-protocol',
            'infinite-map/render-pipeline',
            'infinite-map/input-pipeline',
            'infinite-map/patch-engine',
            'infinite-map/camera-viewport',
            'infinite-map/virtualization',
            'infinite-map/theme-system',
            'infinite-map/doc-serialization',
          ],
        },
        {
          type: 'category',
          label: 'infinite-map-editor 插件开发',
          items: [
            'infinite-map-editor/overview',
            'infinite-map-editor/plugin-development',
            'infinite-map-editor/plugin-reference',
            'infinite-map-editor/customization',
          ],
        },
        'library/project-structure',
      ],
    },
    {
      type: 'category',
      label: '附录',
      collapsed: true,
      items: [
        'releasing',
        'library/demos',
        'library/faq',
      ],
    },
  ],
};

export default sidebars;
