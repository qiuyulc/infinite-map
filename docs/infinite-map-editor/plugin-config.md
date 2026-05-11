# 插件配置

`createDefaultEditorPluginsWithUI()` 的所有可配置项及其默认值。

## 快速示例

```ts
import { createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor'

const plugins = createDefaultEditorPluginsWithUI({
  rulers: { enabled: true },
  minimap: { enabled: true, width: 300, height: 200 },
  toolbar: { enabled: true },
  contextMenu: { enabled: true },
  snap: { enabled: true, guidesEnabled: true },
  marquee: { enabled: true, requireShift: false },
})
```

## 完整配置项

### rulers — 标尺

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用标尺 |
| `thickness` | `number` | `24` | 标尺宽度/高度（px） |

### minimap — 小地图

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用小地图 |
| `width` | `number` | `260` | 小地图宽度（px） |
| `height` | `number` | `160` | 小地图高度（px） |
| `cachePadding` | `number` | `120` | 缓存区的 padding |
| `includeOrigin` | `boolean` | `true` | 是否强制包含原点 (0,0) |
| `showStats` | `boolean` | `false` | 是否显示调试统计 |

### zoomDock — 缩放条

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用缩放条 |
| `snapToggleEnabled` | `boolean` | `true` | 是否显示吸附开关（在缩放条旁） |

### toolbar — 工具栏

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 是否启用工具栏 |
| `items` | `ToolbarItem[]` | 内置默认项 | 自定义工具栏按钮 |
| `position` | `'top-left' \| 'top-right'` | `'top-left'` | 工具栏位置 |

### contextMenu — 右键菜单

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 是否启用右键菜单 |
| `items` | `MenuItem[]` | 内置默认项 | 自定义菜单项 |

### hoverHighlight — 鼠标光晕

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用鼠标周围的光晕效果 |

### marquee — 框选

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用框选 |
| `requireShift` | `boolean` | `false` | 是否需要按住 Shift 才能框选 |
| `storeKey` | `string` | — | 自定义 store key |
| `selectionKey` | `string` | — | 自定义 selection key |
| `minDragPx` | `number` | — | 形成框选所需的最小拖动距离 |

### snap — 吸附

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用吸附 |
| `guidesEnabled` | `boolean` | `true` | 是否显示辅助线 |
| `gridSize` | `number \| 'auto'` | `'auto'` | 网格吸附大小（世界单位） |
| `thresholdPx` | `number` | — | 吸附阈值（屏幕像素） |

### selection — 选择

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `storeKey` | `string` | — | 自定义 store key |
| `clearOnBlankClick` | `boolean` | — | 点击空白是否清空选择 |

### drag — 拖拽

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `dragKey` | `string` | — | 自定义 drag store key |
| `selectOnDrag` | `boolean` | — | 拖拽未选中节点时是否先选中再拖 |
| `selectionKey` | `string` | — | 自定义 selection key |

### resize — 缩放手柄

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `selectionKey` | `string` | — | 自定义 selection key |
| `spaceKey` | `string` | — | 自定义 space key |
| `hitRadiusPx` | `number` | — | 手柄命中半径（px） |
| `minSize` | `number` | — | 最小宽高（世界单位） |

### clipboard — 剪贴板

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用剪贴板 |
| `offsetWorld` | `number` | — | paste/duplicate 时的偏移量 |

### shortcuts — 快捷键

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `commandShortcuts` | `Record<string, string \| null>` | — | 以 commandId 为维度的快捷键覆盖。`null` 禁用 |

```ts
createDefaultEditorPluginsWithUI({
  shortcuts: {
    commandShortcuts: {
      'history.undo': 'Mod+Shift+Backspace',
      'edit.delete': null,  // 禁用删除快捷键
    },
  },
})
```

### view — 视图

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `paddingPx` | `number` | `48` | fit 时的 padding（屏幕像素） |
| `zoomStep` | `number` | `1.2` | zoom 步进倍率 |
| `minZoom` | `number` | `0.25` | 最小缩放 |
| `maxZoom` | `number` | `2.5` | 最大缩放 |

### history — 历史

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `limit` | `number` | — | 历史栈最大长度 |

### keyboardState — 键盘状态

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `spaceKey` | `string` | — | Space 键状态 store key |

## 只启用部分 HUD

```ts
const plugins = createDefaultEditorPluginsWithUI({
  rulers: { enabled: true },
  minimap: { enabled: true },
  toolbar: { enabled: false },
  contextMenu: { enabled: false },
  zoomDock: { enabled: false },
})
```

## 纯编辑插件（无 UI）

```ts
import { createDefaultEditorPlugins } from '@qiuyulc/infinite-map-editor'

const plugins = createDefaultEditorPlugins({
  marquee: { enabled: true, requireShift: false },
  snap: { enabled: true },
  clipboard: { enabled: true },
})
```

---

## 下一步

- [编辑器定制](/infinite-map-editor/customization) — 深入定制工具栏/右键菜单
- [插件 API 参考](/infinite-map-editor/plugin-reference) — 每个插件的详细 API
- [插件开发指南](/infinite-map-editor/plugin-development) — 编写自定义插件
