# 04. 自己加一个功能（新增 HUD 插件示例）

目标：哪怕你 0 基础，也能照着做出一个“能看到效果”的新功能，并理解它放在哪里最合理。

我们做一个最简单的 HUD：右下角显示一个小面板，写着 “Hello Plugin” 和当前 zoom 百分比。

> 这章你会学到：插件文件放哪、怎么渲染到 hud、怎么拿到 camera。

---

## 第 1 步：新建插件文件

在库里新建文件：

`packages/infinite-map/src/editor/plugins/hud/createHelloHudPlugin.tsx`

内容（最小可运行版本）：

```tsx
import type { CSSProperties } from 'react'
import type { InfiniteMapPlugin, MapContext } from '../../types'

function HelloHudOverlay({ ctx }: { ctx: MapContext }) {
  const cam = ctx.getCamera()

  const style: CSSProperties = {
    position: 'absolute',
    right: 12,
    bottom: 12,
    padding: '8px 10px',
    borderRadius: 12,
    background: 'var(--im-panel-bg, rgba(255,255,255,0.72))',
    border: '1px solid var(--im-panel-border, rgba(15,23,42,0.12))',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25))',
    color: 'var(--im-text-strong, rgba(15,23,42,0.9))',
    pointerEvents: 'auto'
  }

  return (
    <div style={style} data-im-ui>
      <div style={{ fontWeight: 700 }}>Hello Plugin</div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>zoom: {Math.round((cam.zoom || 1) * 100)}%</div>
    </div>
  )
}

export function createHelloHudPlugin(): InfiniteMapPlugin {
  return {
    id: 'helloHud',
    slot: 'hud',
    overlayPointerEvents: 'auto',
    overlay: ({ ctx }) => <HelloHudOverlay ctx={ctx} />,
  }
}
```

（先别纠结每个字段，只记住：`slot: 'hud'` 代表它会叠在最上层 UI。）

---

## 第 2 步：把它导出

在：

`packages/infinite-map/src/editor/plugins/index.ts`

加一行：

```ts
export { createHelloHudPlugin } from './hud/createHelloHudPlugin'
```

---

## 第 3 步：在 playground 里启用它

在：

`playground/src/App.tsx`

你有两种方式：

### 方式 A：直接在 plugins 数组里 push（最直观）

把 `plugins` 改成类似：

```ts
const plugins = useMemo(() => {
  return [
    ...createDefaultEditorPlugins({ ... }),
    EditorPlugins.createHelloHudPlugin(),
  ]
}, [...])
```

### 方式 B：把它加到 createDefaultEditorPlugins（更“官方”）

等你理解了默认插件集合后再做这个。

---

## 为什么 “HUD 功能”要做成插件？

因为它是“可插拔 UI”：

- 业务 A 可能要这个 HUD
- 业务 B 不要

如果写死在 `InfiniteMap.tsx`，使用者就没法删掉，也没法替换。

---

## 你现在应该能理解的最小概念

- `InfiniteMap` 是画布容器
- `plugins` 是功能模块（编辑能力 + UI 都算）
- `slot: 'hud'` 的 overlay 会被渲染到最上层 UI

下一步我会把这章的示例代码真的加进仓库（并做一个 “从 0 到 1” 的视频式步骤文档风格）。

