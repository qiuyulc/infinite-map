# 保存/加载（Doc & Resources）

本页说明如何把画布保存成可持久化的 doc，以及如何处理业务侧的大对象（resources）。

## 1）Doc 的最小结构

```json
{
  "schemaVersion": 1,
  "nodes": [],
  "camera": { "x": 0, "y": 0, "zoom": 1 },
  "resources": {},
  "meta": {}
}
```

- `nodes`：画布节点（位置/尺寸/层级等）
- `camera`：视图相机
- `resources`：可选，建议放“大对象业务数据”（富文本、图表数据、附件元信息等）
- `meta`：可选，宿主自定义元信息

## 2）导出/导入（推荐：apiRef）

```ts
const doc = apiRef.current?.exportDoc({ name: 'my-file' })
apiRef.current?.importDoc(doc, { immediate: true })
```

`immediate` 控制相机更新是否“立即生效”（不合并到 rAF）。

## 3）resources 放哪？怎么导出？

建议原则：
- **小字段**放 `node.data`
- **大对象/可复用/需要懒加载**放 `resources`，node 里只放引用（如 `resourceId`）

> 重要：`apiRef.exportDoc()` 默认只导出 `nodes/camera/meta`，不会自动携带你业务侧维护的 resources。

业务侧常见做法是“拼装 doc”：

```ts
import { exportDoc } from '@qiuyulc/infinite-map'

const resources = getResourcesSnapshot() // 你的 store/DB/内存快照
const doc = exportDoc({
  nodes,
  camera: apiRef.current!.getCamera(),
  resources,
  meta: { name: 'my-file' },
})
```

导入时则由业务决定如何处理 resources：
- 若 resources 内联在 doc：直接保存到 resources store
- 若 resources 外置（例如只存 url/hash）：导入后按需加载

## 4）迁移与兼容

`importDoc(any)` 会校验 doc 结构，并且 **仅接受当前 schemaVersion=1**（不做历史版本兼容）。
如果你需要自定义 schema 演进，建议业务侧把不稳定字段放入 `meta/resources`，避免频繁破坏 `nodes` 结构。
