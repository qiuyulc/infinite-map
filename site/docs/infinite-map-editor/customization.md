# 编辑器定制

本文介绍如何定制 Infinite Map 编辑器的 UI 和行为——工具栏、右键菜单、快捷键、主题、HUD 组件。

---

## 目录

1. [定制工具栏](#1-定制工具栏)
2. [定制右键菜单](#2-定制右键菜单)
3. [定制快捷键](#3-定制快捷键)
4. [外部插件贡献 UI](#4-外部插件贡献-ui)
5. [定制 HUD 组件](#5-定制-hud-组件)
6. [定制节点渲染](#6-定制节点渲染)
7. [定制主题](#7-定制主题)

---

## 1. 定制工具栏

### 按 key 快速排列

不需要导入任何类型，传字符串数组即可（`'|'` = 分隔线）：

```tsx
const plugins = createDefaultEditorPluginsWithUI({
  toolbar: {
    enabled: true,
    items: ['history.undo', 'history.redo', '|', 'view.zoomIn', 'view.zoomOut', '|', 'edit.delete'],
  },
});
```

内置 key：`history.undo` `history.redo` `view.zoomOut` `view.zoomIn` `view.resetZoom` `view.fitView` `view.centerView` `edit.delete`

### 混合自定义项

字符串和 ToolbarItem 对象可以混用：

```tsx
import type { ToolbarItem } from '@qiuyulc/infinite-map-editor';

const plugins = createDefaultEditorPluginsWithUI({
  toolbar: {
    enabled: true,
    items: [
      'history.undo',
      'history.redo',
      '|',
      { type: 'command', id: 'my.export', label: '导出', icon: <ExportIcon /> },
      '|',
      'edit.delete',
    ],
  },
});
```

### 完整自定义

```tsx
import type { ToolbarItem } from '@qiuyulc/infinite-map-editor';

const customItems: ToolbarItem[] = [
  // 分隔线
  { type: 'separator' },

  // 运行命令的按钮
  {
    id: 'undo',
    type: 'command',
    commandId: 'history.undo',
    label: '撤销',
    shortcut: '⌘Z',
  },
  {
    id: 'redo',
    type: 'command',
    commandId: 'history.redo',
    label: '重做',
    shortcut: '⇧⌘Z',
  },

  // 分隔线
  { type: 'separator' },

  // 自定义渲染按钮
  {
    id: 'custom',
    type: 'custom',
    label: '我的按钮',
    render: (ctx) => {
      return (
        <button onClick={() => console.log('clicked')}>
          自定义
        </button>
      );
    },
  },
];

const plugins = createDefaultEditorPluginsWithUI({
  toolbar: {
    enabled: true,
    items: customItems,
    position: 'top-left',  // 或 'top-right'
  },
});
```

### ToolbarItem 类型

```ts
type ToolbarItem =
  | { type: 'separator' }
  | {
      type: 'command';
      id: string;
      commandId: string;
      label: string;
      shortcut?: string;
      disabled?: boolean;
    }
  | {
      type: 'custom';
      id: string;
      label: string;
      render: (ctx: MapContext) => React.ReactNode;
      disabled?: boolean;
    };
```

默认工具栏包含：undo / redo / zoom in / zoom out / fit view / center view / delete。

---

## 2. 定制右键菜单

### 按 key 快速排列

```tsx
const plugins = createDefaultEditorPluginsWithUI({
  contextMenu: {
    enabled: true,
    items: ['edit.copy', 'edit.paste', 'edit.duplicate', '|', 'edit.delete'],
  },
});
```

内置 key：`edit.copy` `edit.cut` `edit.paste` `edit.duplicate` `edit.delete` `z.bringToFront` `z.bringForward` `z.sendBackward` `z.sendToBack` `edit.group` `edit.ungroup` `edit.lock` `edit.unlock` `edit.hide` `edit.showAll` `view.fitView` `view.centerView` `view.fitSelection` `view.centerSelection`

### 完整自定义

```tsx
import type { ContextMenuItem } from '@qiuyulc/infinite-map-editor';

const customMenu: ContextMenuItem[] = [
  {
    id: 'undo',
    type: 'command',
    commandId: 'history.undo',
    label: '撤销',
    shortcut: '⌘Z',
  },
  {
    id: 'redo',
    type: 'command',
    commandId: 'history.redo',
    label: '重做',
    shortcut: '⇧⌘Z',
  },
  { type: 'divider' },

  // 带子菜单
  {
    id: 'align',
    type: 'submenu',
    label: '对齐',
    children: [
      { id: 'align-left', type: 'command', commandId: 'edit.alignLeft', label: '左对齐' },
      { id: 'align-hcenter', type: 'command', commandId: 'edit.alignHCenter', label: '水平居中' },
      { id: 'align-right', type: 'command', commandId: 'edit.alignRight', label: '右对齐' },
      { type: 'divider' },
      { id: 'align-top', type: 'command', commandId: 'edit.alignTop', label: '顶对齐' },
      { id: 'align-vcenter', type: 'command', commandId: 'edit.alignVCenter', label: '垂直居中' },
      { id: 'align-bottom', type: 'command', commandId: 'edit.alignBottom', label: '底对齐' },
    ],
  },
  { type: 'divider' },

  // 条件显示
  {
    id: 'delete',
    type: 'command',
    commandId: 'edit.delete',
    label: '删除',
    shortcut: '⌫',
    // visible 函数接收当前选中的 ID 列表
    visible: (selectedIds) => selectedIds.length > 0,
  },
];

const plugins = createDefaultEditorPluginsWithUI({
  contextMenu: {
    enabled: true,
    items: customMenu,
  },
});
```

### ContextMenuItem 类型

```ts
type ContextMenuItem =
  | { type: 'divider' }
  | {
      type: 'command';
      id: string;
      commandId: string;
      label: string;
      shortcut?: string;
      disabled?: boolean;
      visible?: (selectedIds: string[]) => boolean;
    }
  | {
      type: 'submenu';
      id: string;
      label: string;
      visible?: (selectedIds: string[]) => boolean;
      children: ContextMenuItem[];
    }
  | {
      type: 'custom';
      id: string;
      label: string;
      visible?: (selectedIds: string[]) => boolean;
      render: (ctx: MapContext, selectedIds: string[]) => React.ReactNode;
    };
```

---

## 3. 定制快捷键

通过 `shortcuts.commandShortcuts` 覆盖或禁用默认快捷键：

```tsx
const plugins = createDefaultEditorPluginsWithUI({
  shortcuts: {
    commandShortcuts: {
      // 覆盖
      'history.undo': 'Mod+Shift+Backspace',
      'edit.delete': 'Mod+Backspace',

      // 禁用一个快捷键（设为 null）
      'edit.cut': null,

      // 添加额外快捷键（多键绑定）
      'edit.copy': 'Mod+C, Ctrl+Insert',
    },
  },
});
```

快捷键语法：`Mod+Key` 格式（`Mod` 在 Mac 上为 `Cmd`，Windows 上为 `Ctrl`）。支持用逗号分隔多个快捷键绑定同一个命令。

所有内置命令 ID 见 [命令速查表](/library/commands)。

---

## 4. 外部插件贡献 UI

你的自定义插件可以向工具栏和右键菜单贡献按钮/菜单项，无需手动配置 `items` 数组。

### 贡献工具栏按钮

```ts
import { STORE_KEYS } from '@qiuyulc/infinite-map';
import type { ToolbarItem } from '@qiuyulc/infinite-map-editor';

const myPlugin: InfiniteMapPlugin = {
  id: 'my-plugin',
  setup: (ctx) => {
    // 注册到 toolbar items registry
    const prev = ctx.store.get<ToolbarItem[]>(STORE_KEYS.toolbarItems) ?? [];
    ctx.store.set(STORE_KEYS.toolbarItems, [
      ...prev,
      {
        id: 'my-action',
        type: 'command',
        commandId: 'my-plugin.action',
        label: '我的操作',
      },
    ]);
  },
};
```

Toolbar 插件会自动合并 `STORE_KEYS.toolbarItems` 到工具栏中。

### 贡献右键菜单项

```ts
import { STORE_KEYS } from '@qiuyulc/infinite-map';
import type { ContextMenuItem } from '@qiuyulc/infinite-map-editor';

const myPlugin: InfiniteMapPlugin = {
  id: 'my-plugin',
  setup: (ctx) => {
    const prev = ctx.store.get<ContextMenuItem[]>(STORE_KEYS.contextMenuItems) ?? [];
    ctx.store.set(STORE_KEYS.contextMenuItems, [
      ...prev,
      {
        id: 'my-menu-item',
        type: 'command',
        commandId: 'my-plugin.action',
        label: '我的操作',
      },
    ]);
  },
};
```

---

## 5. 定制 HUD 组件

### 自定义标尺

```tsx
const plugins = createDefaultEditorPluginsWithUI({
  rulers: {
    enabled: true,
    thickness: 32,  // 标尺宽度/高度（px）
  },
});
```

### 自定义小地图

```tsx
const plugins = createDefaultEditorPluginsWithUI({
  minimap: {
    enabled: true,
    width: 300,
    height: 200,
    includeOrigin: true,   // 是否强制包含原点 (0,0)
    showStats: false,      // 是否显示调试统计
  },
});
```

### 自定义缩放条

```tsx
const plugins = createDefaultEditorPluginsWithUI({
  zoomDock: {
    enabled: true,
    snapToggleEnabled: true,  // 是否显示吸附开关
  },
});
```

### 完全自定义 HUD 布局

如果你需要超出默认配置的 HUD 定制（例如把小地图放在左上角），可以不用默认组装，手动控制每个 HUD 插件：

```tsx
import { composePlugins } from '@qiuyulc/infinite-map-editor';
import { createDefaultEditorPlugins } from '@qiuyulc/infinite-map-editor';
import {
  createMinimapPlugin,
  createRulersPlugin,
  createZoomDockPlugin,
  createToolbarPlugin,
} from '@qiuyulc/infinite-map-editor';

const core = createDefaultEditorPlugins({ /* core options */ });

const plugins = composePlugins([
  ...core,
  createMinimapPlugin({ width: 300, height: 200 }),
  createRulersPlugin({ thickness: 24 }),
  createZoomDockPlugin({ snapToggleEnabled: true }),
  // 工具栏放在最后，确保在最上层
  createToolbarPlugin({ enabled: true, position: 'top-right' }),
]);
```

---

## 6. 定制节点渲染

通过 `InfiniteMap` 的 `renderNode` / `renderNodeContent` props 自定义节点外观：

```tsx
<InfiniteMap
  nodes={nodes}
  plugins={plugins}
  renderNode={({ node, children, style }) => (
    <div style={style}>
      {children}
    </div>
  )}
  renderNodeContent={({ node }) => (
    <div style={{ padding: 12 }}>
      <strong>{node.label ?? node.id}</strong>
      <div style={{ fontSize: 12, color: '#888' }}>
        ({node.x.toFixed(0)}, {node.y.toFixed(0)})
      </div>
    </div>
  )}
/>
```

- `renderNode`：控制节点的包裹容器（可以加自定义背景、边框等）
- `renderNodeContent`：控制节点内部内容

详见 [组件 API](/library/component-api)。

---

## 7. 定制主题

Infinite Map 提供了亮色和暗色两套主题，支持深度定制：

```tsx
import { InfiniteMap } from '@qiuyulc/infinite-map';
import {
  lightTheme,
  darkTheme,
  mergeTheme,
  themeToCSSVars,
} from '@qiuyulc/infinite-map-editor';

// 基于亮色主题创建自定义主题
const myTheme = mergeTheme(lightTheme, {
  node: {
    backgroundColor: '#f0f4ff',
    borderColor: '#4a90d9',
    borderRadius: '8px',
  },
  selection: {
    borderColor: '#ff6b35',
    handleColor: '#ff6b35',
  },
  grid: {
    color: '#e8ecf0',
  },
  snapGuide: {
    color: '#ff6b35',
  },
});

// 转换为 CSS 变量注入
const cssVars = themeToCSSVars(myTheme);

<div style={cssVars as React.CSSProperties}>
  <InfiniteMap nodes={nodes} plugins={plugins} />
</div>
```

或者使用 `InfiniteMapThemeProvider`：

```tsx
import { InfiniteMapThemeProvider } from '@qiuyulc/infinite-map-editor';

<InfiniteMapThemeProvider theme={myTheme}>
  <InfiniteMap nodes={nodes} plugins={plugins} />
</InfiniteMapThemeProvider>
```

主题结构见 [主题定制](/library/theming)。

---

## 下一步

- [插件开发指南](/infinite-map-editor/plugin-development) — 编写自定义插件
- [插件 API 参考](/infinite-map-editor/plugin-reference) — 所有内置插件详解
- [架构总览](/infinite-map-editor/overview) — 理解 editor 包整体设计
