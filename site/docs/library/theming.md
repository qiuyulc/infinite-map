# 主题定制

InfiniteMap 通过 CSS 变量（`--im-*`）和 `InfiniteMapTheme` 对象控制所有视觉样式。

## 快速切换亮/暗

```tsx
<InfiniteMap themeBase="dark" nodes={nodes} />
```

`themeBase` 接受 `'light'`（默认）或 `'dark'`。

## 使用 ThemeProvider（推荐）

当你的应用有自己的主题上下文时，用 `InfiniteMapThemeProvider` 注入 CSS 变量：

```tsx
import { InfiniteMapThemeProvider } from '@qiuyulc/infinite-map'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  return (
    <InfiniteMapThemeProvider base={theme}>
      <InfiniteMap nodes={nodes} />
    </InfiniteMapThemeProvider>
  )
}
```

## 覆盖部分颜色

```tsx
<InfiniteMap
  themeBase="light"
  theme={{
    mapBg: '#f0f4ff',            // 画布背景
    selectionStroke: '#ff6b6b',  // 选中框颜色
    nodeBg: '#ffffff',           // 节点背景
  }}
  nodes={nodes}
/>
```

## 所有可定制的颜色 Token

### 画布 / 背景

| Token | CSS 变量 | 说明 |
|---|---|---|
| `mapBg` | `--im-map-bg` | 画布背景色 |
| `mapBorder` | `--im-map-border` | 画布边框色 |
| `mapDot` | `--im-map-dot` | 点阵/网格颜色 |

### 节点

| Token | CSS 变量 | 说明 |
|---|---|---|
| `nodeBg` | `--im-node-bg` | 节点背景色 |
| `nodeText` | `--im-node-text` | 节点文字颜色 |
| `nodeTextMuted` | `--im-node-text-muted` | 节点次要文字 |
| `nodeShadow1` | `--im-node-shadow-1` | 节点阴影（外层） |
| `nodeShadow2` | `--im-node-shadow-2` | 节点阴影（内层） |
| `nodeRadius` | `--im-node-radius` | 节点圆角 |

### 工具栏

| Token | CSS 变量 | 说明 |
|---|---|---|
| `toolbarBg` | `--im-toolbar-bg` | 工具栏背景 |
| `toolbarBorder` | `--im-toolbar-border` | 工具栏边框 |
| `toolbarBtnBg` | `--im-toolbar-btn-bg` | 按钮背景 |
| `toolbarBtnBorder` | `--im-toolbar-btn-border` | 按钮边框 |
| `toolbarBtnText` | `--im-toolbar-btn-text` | 按钮文字 |

### Minimap

| Token | CSS 变量 | 说明 |
|---|---|---|
| `minimapBg` | `--im-minimap-bg` | 小地图背景 |
| `minimapBorder` | `--im-minimap-border` | 小地图边框 |
| `minimapNode` | `--im-minimap-node` | 小地图节点颜色 |
| `minimapViewport` | `--im-minimap-viewport` | 小地图视口框颜色 |

### 面板（右键菜单等）

| Token | CSS 变量 | 说明 |
|---|---|---|
| `panelBg` | `--im-panel-bg` | 面板背景 |
| `panelBorder` | `--im-panel-border` | 面板边框 |
| `textStrong` | `--im-text-strong` | 强调文字颜色 |

### 标尺

| Token | CSS 变量 | 说明 |
|---|---|---|
| `rulerBg` | `--im-ruler-bg` | 标尺背景 |
| `rulerBorder` | `--im-ruler-border` | 标尺边框 |
| `rulerTick` | `--im-ruler-tick` | 标尺刻度线 |
| `rulerText` | `--im-ruler-text` | 标尺文字 |

### 选中 / 手柄

| Token | CSS 变量 | 说明 |
|---|---|---|
| `selectionStroke` | `--im-selection-stroke` | 选中框描边 |
| `selectionShadow` | `--im-selection-shadow` | 选中框阴影 |
| `handleFill` | `--im-handle-fill` | 缩放手柄填充 |
| `handleStroke` | `--im-handle-stroke` | 缩放手柄描边 |

### 辅助线

| Token | CSS 变量 | 说明 |
|---|---|---|
| `guideStroke` | `--im-guide-stroke` | 吸附引导线 |
| `guideShadow` | `--im-guide-shadow` | 吸附引导线阴影 |

## 直接用 CSS 变量覆盖

你也可以在 CSS 中直接覆盖 `--im-*` 变量：

```css
.my-themed-map {
  --im-map-bg: #1a1a2e;
  --im-node-bg: rgba(255, 255, 255, 0.05);
  --im-node-text: #e0e0e0;
  --im-selection-stroke: #00ff88;
}
```

```tsx
<div className="my-themed-map">
  <InfiniteMap nodes={nodes} />
</div>
```

## 编程式创建主题

```ts
import { darkTheme, mergeTheme, themeToCSSVars } from '@qiuyulc/infinite-map'

// 基于 dark theme 微调
const myTheme = mergeTheme(darkTheme, {
  mapBg: '#0a0a1a',
  selectionStroke: '#00ff88',
  nodeRadius: '16px',
})

// 转换为 CSS 变量对象
const vars = themeToCSSVars(myTheme)
// { '--im-map-bg': '#0a0a1a', '--im-selection-stroke': '#00ff88', ... }
```

## 预设主题参考

### 亮色主题（`lightTheme`）

画布背景 `#f7f8fc`，节点白底，蓝色选中框 `rgba(110, 200, 255, 0.95)`。

### 暗色主题（`darkTheme`）

画布背景 `#070a12`，节点深色底，蓝色选中框 `rgba(110, 200, 255, 0.95)`。

> 完整预设值见源码：`packages/infinite-map/src/theme.ts`
