# 14. Milestone 4（Part 1）：History / Clipboard / ZIndex（让编辑器像“真的”一样）

Milestone 3 我们已经把底座（store/bus/command/services）搭起来了。  
现在我们开始把“编辑器的常用能力”补齐。

这一章做三件事：

1) undo/redo（History）  
2) copy/cut/paste/duplicate（Clipboard）  
3) 置顶/置底/上移/下移（ZIndex）  

> 这三件事的共同点：**它们都需要一个“统一的数据修改入口”**，否则你会写出一堆无法撤销/无法复用的逻辑。

---

## Part A：为什么你必须引入 Patch（统一修改入口）

你会发现：

- drag：改 x/y
- resize：改 w/h
- delete：删节点
- paste：加节点
- zIndex：改 z

如果这些修改散落在各处直接 `setNodes`：

- history 很难做（你得自己猜“改了什么”）
- 协作很难做（你不知道同步什么）
- 调试很难做（没有统一日志）

所以建议你从 0 重写时，把修改统一成：

```txt
plugins → 产生 patches → document.applyPatches(patches, meta) → nodes 更新 → 通知刷新
```

---

## Part B：History（undo/redo）

### 目标
- Ctrl/Cmd+Z：撤销
- Ctrl/Cmd+Shift+Z：重做

### 最小数据结构（store）

```ts
historyUndoStack: PatchBatch[]
historyRedoStack: PatchBatch[]
```

### 最小原则（先只做到能用）

1) 每次 document.applyPatches 都会生成一个 batch  
2) 把 batch push 到 undoStack，并清空 redoStack  
3) undo：pop undoStack，把 batch 反向应用  
4) redo：pop redoStack，把 batch 正向应用  

> 反向应用需要“反向 patch”。最简单的做法是：apply 前先拿到旧值，构造 inverse patches。

---

## Part C：Clipboard（复制/粘贴/重复）

### 目标
- Ctrl/Cmd+C：copy
- Ctrl/Cmd+X：cut
- Ctrl/Cmd+V：paste
- Ctrl/Cmd+D：duplicate（可选）

### 关键点 1：复制的是“节点数据”，不是 DOM

clipboard 存的应该是：

```ts
NodeData[]  // 或者更严谨：只存选中的那部分 + 偏移信息
```

### 关键点 2：paste 要避免 id 冲突

你需要一个 `idFactory` 或 `nanoid`（从0重写时可以先用递增）。

paste 时做：

1) 生成新 id
2) 给 x/y 加一个偏移（例如 +24/+24）
3) 输出 add patches

---

## Part D：ZIndex（层级）

### 目标
- bringToFront / sendToBack
- bringForward / sendBackward（上移一层/下移一层）

### 关键点：多选时要保持相对顺序

例如选中 A、B 两个节点：

- 上移一层：这两个整体往前挪一层
- A 和 B 的相对顺序不变

实现上一般是：

1) 取所有节点按 z 排序
2) 对选中集合做一次“整体移动”
3) 最后重新 normalize z（避免 z 无限增长）

---

## 验证清单（playground）

1) 拖拽一次，然后 Ctrl+Z 能回到原位置  
2) 复制粘贴后出现新节点，id 不冲突，位置有偏移  
3) 多选两个节点，上移一层不会打乱它们顺序  

---

## 本章结束：你能讲出来的一句话（面试）

> 我把所有节点修改统一到 Patch 管道，因此 History/Clipboard/ZIndex 都可以复用同一套 applyPatches 机制：history 记录 patch batch 并生成 inverse patches，clipboard/paste 通过 add patches 扩展节点集合，zIndex 通过 set patches 批量调整并在最后 normalize，保持可扩展与可维护。

