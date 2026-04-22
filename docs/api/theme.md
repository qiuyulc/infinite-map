# Theme / CSS Variables（阶段 1）

## 1) 推荐方式：InfiniteMapThemeProvider

`InfiniteMapThemeProvider` 会把主题变量写在**局部容器**上，内部组件通过 `var(--im-xxx)` 继承即可。

## 2) 变量命名约定

本项目的主题变量统一使用 `--im-` 前缀（例如 `--im-toolbar-bg`）。

## 3) Canvas 组件的注意事项

Minimap/Highlight layer 是 canvas 绘制：

- DOM 里 `var(--im-xxx)` 会自动生效
- canvas 需要在绘制时主动读取 `getComputedStyle(canvas).getPropertyValue('--im-xxx')`
- 主题切换时需要触发重绘（`useThemeVersion`）

