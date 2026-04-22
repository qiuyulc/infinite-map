# 31. 注释版：components/InfiniteMap.tsx（它到底做了什么）

这页的目标：

> 你打开 `InfiniteMap.tsx` 不再害怕：知道每一段代码在做什么、为什么要这么写。

对应文件：

- `packages/infinite-map/src/components/InfiniteMap.tsx`

---

## 1）这个组件在 UI 上做了什么？

你可以把它理解成 4 层叠加：

```txt
背景（dots/grid） + 节点（DOM） + overlay（辅助线/选中框） + hud（工具栏/右键/minimap/缩放条）
```

并且它还做了一个非常关键的事：

> **如果你传了 plugins，它就变成“编辑器”；不传 plugins，它就是“纯预览”。**

---

## 2）为什么 props 这么多？

因为 `<InfiniteMap />` 既想做“组件库”，又想做“编辑器内核”，所以它提供了很多“扩展点”：

- `plugins`：是否启用编辑器系统
- `onNodesChange/onPatches`：数据变更出口（你要接协作/历史就用 patches）
- `renderNode/renderNodeContent`：节点渲染自定义
- `themeBase/theme`：主题（最终都会变成 CSS vars）
- `apiRef`：把 editor 的能力暴露出去（给外部自定义工具栏用）

---

## 3）关键段落 A：各种 ref 的意义（避免闭包过期）

源码位置（大概在 240 行附近）：

```ts
// nodes/visibleNodes refs：给插件 ctx 读取，避免闭包过期
const nodesRef = useRef(nodes)
useEffect(() => {
  nodesRef.current = nodes
}, [nodes])

// 鼠标位置不需要触发 React re-render，用 ref 可避免拖动时“闪烁/卡顿”
const mouseRef = useRef<{ x: number; y: number } | null>(null)
```

你只要记住一句话：

> 插件/事件回调经常在“之后”才执行，如果用 state，会拿到旧值；用 ref 能保证拿到最新值。

---

## 4）关键段落 B：坐标换算（screen ↔ world）

源码位置（大概在 280 行附近）：

```ts
const screenToWorld = (p) => {
  const z = cameraRef.current.zoom || 1
  return { x: cameraRef.current.x + p.x / z, y: cameraRef.current.y + p.y / z }
}

const worldToScreen = (p) => {
  const cam = cameraRef.current
  const z = cam.zoom || 1
  return { x: (p.x - cam.x) * z, y: (p.y - cam.y) * z }
}
```

为什么这是核心？

- 鼠标移动/点击给的是 screen（像素）
- 节点位置/吸附/框选等在 world 坐标里算
- 不换算，缩放后拖拽/命中测试都会错

---

## 5）关键段落 C：store + bus（插件共享状态/事件）

源码位置（大概在 315 行附近）：

```ts
// 插件 bus/store（稳定引用）
const bus = useMemo(() => createEventBus(), [])
const store = useMemo(() => createStore(), [])
```

这是为了让插件之间可以：

- store：共享状态（selection ids、history stack、minimap config…）
- bus：共享事件（selection:change、camera:changed…）

---

## 6）关键段落 D：applyPatches（统一数据修改入口）

源码里有 `applyPatches(patches, meta)`：

它做了几件事：

1) 调用 onBeforeApplyPatches hook（允许用户拦截/改 patches）
2) 采样变更前快照 `beforeById`（给 history 做 inverse patches）
3) emit `patches:applied`（让 history/其他插件响应）
4) `onPatches` 回调
5) 如果用户传了 `onNodesChange`，就把 patches 应用到 nodes 并回调出去

你要记住的一句最重要的话：

> **编辑器里所有对 nodes 的修改，最好都走 patches**，这样 undo/redo、协作、调试都更容易。

---

## 7）关键段落 E：ctx（MapContext）为什么要这样构造？

源码位置（大概在 391 行附近）：

```ts
const ctx: MapContext = useMemo(() => {
  const services: Record<string, unknown> = {}
  const registerService = (name, service) => { services[name] = service }
  const getService = (name) => services[name]

  return {
    getCamera: () => cameraRef.current,
    getViewport: () => viewportRef.current,
    getNodes: () => nodesRef.current,
    getVisibleNodes: () => visibleNodesRef.current,
    screenToWorld,
    worldToScreen,
    applyPatches,
    bus,
    store,
    registerService,
    getService,
    runCommand: (id, payload) => { ... }
  }
}, [...])
```

为什么要这么写？

- ctx 是“插件能用的工具箱”
- ctx 内部通过 ref 读最新状态（避免闭包过期）
- services 是“可替换能力注入”（camera/selection/document…）

---

## 8）关键段落 F：事件分发（plugins handlers）

你会看到它把 React 的事件包装成 `MapPointerEvent/MapWheelEvent/...`：

- 把 `clientX/clientY` 转成画布内 `screen` 坐标
- 再算出 `world` 坐标
- 然后按插件顺序调用 handlers

为什么要包装成 MapPointerEvent？

> 让插件不用关心 React/DOM 细节，只关心 screen/world/modifiers 这些“编辑器语义”。

---

## 9）你看懂 InfiniteMap.tsx 的最低要求（自测）

你现在如果能回答这 3 个问题，就算读懂了 70%：

1) 为什么 nodes/camera/viewport 都要用 ref？  
2) 为什么要有 screenToWorld/worldToScreen？  
3) plugins 的 handlers 是怎么被调用的？顺序为什么重要？

