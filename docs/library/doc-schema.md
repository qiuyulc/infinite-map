# Doc schema 与迁移（持久化格式）

Doc schema 用于“保存/加载”画布内容。它与 npm 包版本解耦，通过 `schemaVersion` 自己演进。

---

## 1）为什么要 schemaVersion

当你升级库时：
- 节点字段可能变化（重命名/默认值变化/结构调整）
- 相机/元信息可能扩展

如果没有 schemaVersion + migrations，旧存档会直接报废。

---

## 2）当前最新：v2

最小结构：

```json
{
  "schemaVersion": 2,
  "nodes": [],
  "camera": { "x": 0, "y": 0, "zoom": 1 },
  "resources": {},
  "meta": {}
}
```

字段说明：
- `nodes`: `NodeData[]`（包含 `parentId` 的组结构等）
- `camera`: 相机
- `resources`: **可选**，用于放“大对象业务数据”
  - 推荐：节点里只放轻量字段（例如 `resourceId`），真正业务数据放 `resources[resourceId]`
  - 这样更利于 history/协作/迁移（避免巨大 patches）
- `meta`: **可选**，宿主自定义信息（例如：文件名、最后保存时间、作者等）

---

## 3）导出/导入 API

推荐用 `apiRef`：
- `api.exportDoc(meta?)`
- `api.importDoc(doc, { immediate? })`

底层纯函数也可用：
- `exportDoc({ nodes, camera, resources?, meta? })`
- `importDoc(any)`：返回最新版本（会校验与迁移）

---

## 4）迁移策略

`importDoc` 具备 migrations：
- legacy v0（无 schemaVersion）→ 自动升级
- v1 → v2（新增 `resources`）
- v2 → 校验后通过

建议：
1. schema breaking change 才递增 `schemaVersion`
2. 保持 migrations 可组合（v0→v1→v2→…）
3. 对外文档里明确哪些字段稳定，哪些字段建议放到 `meta/resources`（避免频繁 breaking）

