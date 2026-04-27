# 常见问题

## 1）为什么“看起来不能编辑/拖不动”？

请检查是否提供了变更出口：
- `editMode="controlled"` 时，必须提供 `onNodesChange` 或 `onPatches`
- `editMode="auto"` 且未提供变更出口时，会自动退化为预览（编辑 UI/交互会被禁用）

## 2）我只想预览，但希望能 pan/zoom

```tsx
<InfiniteMap nodes={nodes} plugins={plugins} editMode="readonly" />
```

## 3）resources 应该放哪里？为什么 exportDoc 没带上？

`resources` 建议由业务侧维护（可能很大/可能外置/可能要鉴权）。
`apiRef.exportDoc()` 默认只导出画布内核状态（nodes/camera/meta）。导出完整 doc 时由业务自行拼装：

```ts
import { exportDoc } from '@qiuyulc/infinite-map'

const doc = exportDoc({ nodes, camera, resources, meta })
```

见：[保存/加载（Doc & Resources）](/library/persistence)。

## 4）如何做多人协作？

Infinite Map 输出 `onPatches` 作为协作操作流，业务侧负责网络同步与顺序控制。
见：[多人协作接入](/library/collaboration)。

## 5）为什么 Cmd/Ctrl+C 会影响整个页面？

画布的快捷键来自全局 `keydown` 监听。为避免“劫持整页复制”，目前的策略是：
- 只有当画布容器处于 focus（点击过画布）时，快捷键才生效
- 如果光标在输入框/可编辑区域（input/textarea/contenteditable），不拦截默认复制粘贴

如果你希望“永远不处理快捷键”，可在插件层移除 `createShortcutsPlugin()`。
