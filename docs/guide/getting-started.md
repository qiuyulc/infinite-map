# 快速开始

> 本项目是一个 monorepo：库在 `packages/infinite-map`，演示在 `playground`，文档在 `docs`。

## 安装

```bash
pnpm i
```

## 本地开发

```bash
pnpm dev
```

- `packages/infinite-map`：tsup watch 输出到 `es/`、`lib/`
- `playground`：Vite dev server
- `docs`：VitePress（可单独运行：`pnpm -C docs dev`）

## 最小使用方式（示例思路）

在业务项目中通常会：

1. 引入 `<InfiniteMap />`
2. 准备 `nodes: NodeData[]`
3. 挂载 editor 插件（可选）
4. 用 `InfiniteMapThemeProvider` 或 CSS vars 做主题

> 具体 API 以 `packages/infinite-map/src/index.ts` 的导出为准；可配合 [公开导出总览](../api/public-api) 查看。

