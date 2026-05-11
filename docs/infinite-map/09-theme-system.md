# 9. 主题系统

> 涉及的源文件：`theme.ts`、`components/InfiniteMapThemeProvider.tsx`、`theme-base.css`
>
> 通过 CSS 变量（`--im-*`）统一控制画布所有视觉样式。

---

## 9.1 架构

```
theme.ts              定义颜色 token 类型 + light/dark 预设 + 合并函数
    ↓
theme-base.css         基础 CSS 变量（light 默认值）
    ↓
InfiniteMapThemeProvider  将 theme 对象转换为 CSS 变量注入容器
    ↓
所有组件/插件         通过 var(--im-map-bg) 等引用变量
```

---

## 9.2 Token 分类

| 分组 | 变量前缀 | 控制范围 |
|---|---|---|
| 画布 | `--im-map-*` | 背景色、边框、点阵颜色 |
| 节点 | `--im-node-*` | 节点背景、文字、阴影、圆角 |
| 工具栏 | `--im-toolbar-*` | 按钮背景/边框/文字 |
| Minimap | `--im-minimap-*` | 小地图背景、节点色 |
| 面板 | `--im-panel-*` | 右键菜单背景 |
| 标尺 | `--im-ruler-*` | 标尺背景/刻度/文字 |
| 选中 | `--im-selection-*` | 选中框描边/阴影 |
| 手柄 | `--im-handle-*` | 缩放手柄颜色 |
| 辅助线 | `--im-guide-*` | 吸附引导线 |

---

## 9.3 使用方式

**方式 1：themeBase prop**
```tsx
<InfiniteMap themeBase="dark" />
```
自动应用 dark 预设。

**方式 2：theme prop（部分覆盖）**
```tsx
<InfiniteMap
  themeBase="light"
  theme={{ selectionStroke: '#ff0000', mapBg: '#f0f0f0' }}
/>
```
只覆盖指定字段，其余使用 light 预设。

**方式 3：ThemeProvider 包裹**
```tsx
<InfiniteMapThemeProvider base="dark" theme={{ nodeRadius: '16px' }}>
  <InfiniteMap />
</InfiniteMapThemeProvider>
```
适合需要在外部控制主题的场景。

**方式 4：CSS 覆盖**
```css
.my-map { --im-map-bg: #1a1a2e; --im-selection-stroke: #00ff88; }
```

---

## 9.4 实现细节

`themeToCSSVars(theme)` 将 `InfiniteMapTheme` 对象转换为 `{ '--im-map-bg': '#f7f8fc', ... }` 对象，由 `InfiniteMapThemeProvider` 或 `InfiniteMap` 以 inline style 写入容器。

`mergeTheme(base, override)` 用 spread 合并，`override` 中的字段覆盖 `base`。`InfiniteMapThemeProvider` 先将 base 的 CSS 变量写入容器，再用 `themeOverrideToCSSVars` 只写入覆盖项。
