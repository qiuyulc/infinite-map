# 32. 注释版：editor/runtime.ts（store/bus/patch 管道）

对应文件：

- `packages/infinite-map/src/editor/runtime.ts`

这份文件很“底层”，但它只做 3 件事：

1) `createEventBus()`：一个极简事件总线（on/emit）  
2) `createStore()`：一个极简状态仓库（get/set/subscribe）  
3) `applyPatchesToNodes()`：把 patches 应用到 nodes（纯函数）  

---

## 1）createEventBus：为什么要有 bus？

核心代码（节选 + 注释）：

```ts
export function createEventBus() {
  // listeners: eventType -> Set(handlers)
  const listeners = new Map()

  const on = (type, handler) => {
    // 1) 注册监听
    // 2) 返回 unsubscribe 函数，方便插件 teardown 清理
  }

  const emit = (type, payload) => {
    // 关键点：拷贝一份 set 再遍历
    // 原因：handler 里可能会取消订阅，直接遍历会影响迭代
  }

  return { on, emit }
}
```

你只要记住：bus 负责“发生了什么”的通知，例如：

- `selection:change`
- `camera:changed`
- `patches:applied`

---

## 2）createStore：为什么要有 store？

核心代码（节选 + 注释）：

```ts
export function createStore() {
  const data = new Map() // key -> value
  const subs = new Map() // key -> Set(listeners)

  const get = (key) => data.get(key)

  const set = (key, value) => {
    data.set(key, value)
    // 只通知订阅了这个 key 的监听者
    // 这样不会“全局刷新”，性能更稳
  }

  const subscribe = (key, listener) => {
    // 注册订阅并返回取消函数
  }

  return { get, set, subscribe }
}
```

store 负责“现在的状态是什么”，例如：

- `selection:ids`
- `history:undoStack`
- `minimap:config`
- `view:config`

---

## 3）applyPatchesToNodes：为什么要用 patches？

核心代码（节选 + 注释）：

```ts
export function applyPatchesToNodes(nodes, patches) {
  let out = nodes
  for (const p of patches) {
    switch (p.type) {
      case 'move':
        // move 是 set 的快捷形式
        out = out.map(n => n.id === p.id ? { ...n, x: p.x, y: p.y } : n)
        break
      case 'set':
        // set 支持部分字段更新（w/h/z/rotate/...）
        out = out.map(n => n.id === p.id ? { ...n, ...p.data } : n)
        break
      case 'add':
        out = [...out, p.node]
        break
      case 'remove':
        out = out.filter(n => n.id !== p.id)
        break
    }
  }
  return out
}
```

你要记住的一句话：

> patches 是“统一修改入口”。一旦统一了，history/协作/调试都会简单很多。

---

## 4）rectFromWorldView：它在干嘛？

```ts
export function rectFromWorldView(camera, viewport) {
  // 把 viewport（屏幕像素）换算成 world 的可视矩形
  // 这在虚拟化、minimap、fit view 等场景经常用
  const z = camera.zoom || 1
  return { x: camera.x, y: camera.y, w: viewport.w / z, h: viewport.h / z }
}
```

