# Infinite Map

一个 React 的无限画布/编辑器内核（`@qiuyulc/infinite-map`）+ 默认编辑器插件与 UI kit（`@qiuyulc/infinite-map-editor`）。

> 使用手册见 `docs/`（VitePress）。

## 包说明

- `@qiuyulc/infinite-map`
  - `<InfiniteMap />`：渲染层 + 编辑器运行时（store/bus/patches）
  - 插件输入管线（Scheme C）：`hitTest → pointerDownProcessors → gestures`
  - Doc 持久化：`serializeDoc/parseDoc`（schemaVersion=1）
- `@qiuyulc/infinite-map-editor`
  - 内置插件工厂：selection/drag/resize/rotate/marquee/history/minimap/toolbar/…
  - `composePlugins()`：依赖校验 + 拓扑排序

## 引入方式

两个包都支持 ESM / CJS / TypeScript，通过 `package.json` 的 `exports` 字段自动解析：

```ts
// ESM（推荐）—— 默认入口
import { InfiniteMap } from "@qiuyulc/infinite-map";
import { createDefaultEditorPluginsWithUI } from "@qiuyulc/infinite-map-editor";

// CJS
const { InfiniteMap } = require("@qiuyulc/infinite-map");

// 子路径导出
import { DefaultNode } from "@qiuyulc/infinite-map/ui";
import { makeDemoNodes } from "@qiuyulc/infinite-map/demo";

// 按需深路径（tree-shaking 友好）
import { createDragPlugin } from "@qiuyulc/infinite-map-editor/es/plugins/createDragPlugin";
```

TypeScript 类型声明随包附带，无需额外安装 `@types/*`。CSS 已通过 `sideEffects` 声明，bundler 不会误删。

## 本地开发

```bash
pnpm install

# 启动 playground
pnpm -C playground dev

# 启动文档站
pnpm -C docs dev
```

## 最小用法（纯渲染）

```tsx
import { InfiniteMap, type NodeData } from "@qiuyulc/infinite-map";

const nodes: NodeData[] = [
  { id: "a", x: -60, y: -30, width: 120, height: 60, label: "A" },
];

export function App() {
  // 纯预览不需要变更出口
  return <InfiniteMap nodes={nodes} />;
}
```

## 启用编辑器（插件 + UI）

```tsx
import { InfiniteMap, type NodeData } from "@qiuyulc/infinite-map";
import { createDefaultEditorPluginsWithUI } from "@qiuyulc/infinite-map-editor";

export function EditorApp() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const plugins = useMemo(() => createDefaultEditorPluginsWithUI(), []);

  return (
    <InfiniteMap
      nodes={nodes}
      plugins={plugins}
      editMode="controlled"
      onNodesChange={(next) => setNodes(next)}
    />
  );
}
```

> 注意：启用 plugins 且希望编辑生效时，需要提供 `onNodesChange` 或 `onPatches` 作为变更出口；否则会退化为预览（编辑 UI/交互会被禁用）。

## 保存/加载（Doc schema）

推荐通过 `apiRef`：

```tsx
const apiRef = useRef<InfiniteMapApi | null>(null);

// 保存
const doc = apiRef.current?.serializeDoc();
localStorage.setItem("doc", JSON.stringify(doc));

// 加载
const raw = localStorage.getItem("doc");
if (raw) apiRef.current?.parseDoc(JSON.parse(raw), { immediate: true });
```