# Playground

这是 `@qiuyulc/infinite-map` + `@qiuyulc/infinite-map-editor` 的本地演示与回归场。

## 启动

在仓库根目录：

```bash
pnpm install
pnpm -C playground dev
```

## 常用脚本

```bash
# 构建（用于 CI 或本地回归）
pnpm -C playground build
```

## 你应该在这里验证什么

- Scheme C 输入管线（hitTest → processors → gestures）的交互是否回归
- selection / drag / resize / rotate / marquee / pan 是否符合预期
- HUD（minimap/toolbar/context menu）是否被画布错误 capture

