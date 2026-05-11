# 10. Doc 序列化

> 涉及的源文件：`editor/document.ts`
>
> 提供画布状态的序列化（保存）和反序列化（加载），用于文件持久化和协作同步。

---

## 10.1 Doc 结构

```ts
type InfiniteMapDoc = {
  schemaVersion: 1;
  nodes: NodeData[];                    // 所有节点
  camera: Camera;                        // 当前相机
  resources?: Record<string, unknown>;   // 外置资源（宿主自行管理）
  meta?: Record<string, unknown>;        // 宿主自定义元信息
};
```

---

## 10.2 保存

```ts
function serializeDoc({ nodes, camera, resources, meta }): InfiniteMapDoc {
  return {
    schemaVersion: DOC_SCHEMA_VERSION,  // 固定为 1
    nodes: input.nodes,                  // 节点数组原样导出
    camera: input.camera,                // 相机状态
    resources: input.resources ?? {},    // 宿主提供的外置资源
    meta: input.meta,                    // 宿主自定义元信息
  };
}
```

**注意：** `apiRef.serializeDoc()` 自动导出 nodes + camera，但 `resources` 需要宿主自行拼装。

---

## 10.3 加载

```ts
function parseDoc(input: unknown): InfiniteMapDoc {
  // 1. 校验顶层结构
  assert(isObject(input), 'doc must be an object');

  // 2. 校验 schemaVersion（只接受当前版本）
  assert(input.schemaVersion === DOC_SCHEMA_VERSION, '不支持的版本');

  // 3. 校验 nodes（每个节点的必填字段）
  validateNodes(input.nodes);

  // 4. 校验 camera（x/y/zoom 类型和存在性）
  validateCamera(input.camera);

  return input as InfiniteMapDoc;
}
```

**为什么不做历史版本兼容？** 项目处于 0.x，格式频繁变化。维护迁移矩阵会随版本数指数增长。业务侧如有旧格式，自行转换后调用 `parseDoc`。

---

## 10.4 使用示例

```tsx
// 保存
const doc = apiRef.current?.serializeDoc({ name: 'my-file' });
localStorage.setItem('my-doc', JSON.stringify(doc));

// 加载
const raw = localStorage.getItem('my-doc');
if (raw) apiRef.current?.parseDoc(JSON.parse(raw), { immediate: true });
```

---

## 10.5 与 Patch 系统的关系

```
序列化：运行时状态 → Doc (完整快照)
        用于：文件保存、协作消息中的全量同步

Patch：  编辑操作 → NodePatch[] (差量变更)
        用于：撤销重做、实时协作同步

两者互补：
  - 首次加载用 parseDoc (全量)
  - 编辑过程用 onPatches (差量)
```
