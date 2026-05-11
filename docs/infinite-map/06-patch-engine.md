# 6. Patch 引擎

> 涉及的源文件：`hooks/usePatchEngine.ts`、`editor/runtime.ts`（applyPatchesToNodes）
>
> Patch 引擎负责接收插件产生的变更、合并高频操作、触发宿主回调。

---

## 6.1 applyPatches 入口

```ts
function applyPatches(patches: NodePatch[], meta: ChangeMeta) {
  // 1. onBeforeApplyPatches hook（可拦截/修改 patches）
  const hook = hooksRef.current?.onBeforeApplyPatches;
  if (hook) usePatches = hook(patches, meta) ?? patches;

  // 2. move-phase 合并（关键性能优化）
  if (meta.phase === 'move') {
    mergeIntoPending(usePatches, meta);  // rAF 批量提交
    return;
  }

  // 3. 采样 beforeById（供 history 计算逆向 patch）
  const beforeById = snapshot(usePatches);

  // 4. 通知总线
  bus.emit('patches:applied', { patches: usePatches, meta, beforeById });

  // 5. 调用宿主回调
  onPatches?.(usePatches, meta);                     // 原始 patches
  if (onNodesChange) {
    const next = applyPatchesToNodes(nodes, usePatches);
    onNodesChange(next, meta);                        // 完整 nodes
  }

  // 6. onAfterApplyPatches hook
  hooksRef.current?.onAfterApplyPatches?.(usePatches, meta);
}
```

---

## 6.2 move-phase 合并

拖拽节点时，鼠标每移动 1px 就产生一个 `{ type:'move', phase:'move' }` patch。如果每个都触发 `setNodes` → React re-render，每秒 60 次会卡死。

**合并策略：**

```
Frame 1: move(id=A, x=100) ──┐
Frame 2: move(id=A, x=101)    │ rAF 合并
Frame 3: move(id=A, x=102)    │
Frame 4: move(id=A, x=103) ──┘ → 提交 move(id=A, x=103)

然后 end(id=A, x=103, phase:'end') → 直接提交（不合并）
```

```ts
if (meta.phase === 'move') {
  // 同一帧内对同一节点的 move 取最新值
  pendingMovePatches = mergeMovePatches(pendingMovePatches, usePatches);
  if (!pendingRaf) pendingRaf = requestAnimationFrame(flushPending);
  return;
}
```

---

## 6.3 applyPatchesToNodes

纯函数，将 patches 应用到节点数组：

```ts
function applyPatchesToNodes(nodes, patches): NodeData[] {
  let out = nodes;
  for (const p of patches) {
    switch (p.type) {
      case 'move': out = out.map(n => n.id === p.id ? {...n, x:p.x, y:p.y} : n); break;
      case 'set':  out = out.map(n => n.id === p.id ? {...n, ...p.data} : n); break;
      case 'add':  out = [...out, p.node]; break;
      case 'remove': out = out.filter(n => n.id !== p.id); break;
    }
  }
  return out;
}
```

---

## 6.4 与编辑器模式的关系

```
editMode='controlled'
  → 需要 onNodesChange 或 onPatches
  → applyPatches 正常执行

editMode='readonly'
  → applyPatches 入口直接 return
  → 所有编辑操作静默丢弃

editMode='auto'（默认）
  → 无变更出口时 → 等同于 readonly
  → 有变更出口时 → 等同于 controlled
```
