# 多人协作接入（业务侧）

Infinite Map 本身不内置协作服务端；它提供的是 **可重放的 patches 变更流**，业务侧可以用任意方式（WebSocket、HTTP、消息队列）同步。

## 1）推荐数据流

1. 本地编辑产生 `onPatches(patches, meta)`
2. 客户端 **本地 apply**（UI 立即更新）
3. 同时把 `{ patches, meta }` 发送到后端
4. 其他客户端收到后端广播后，按顺序重放 patches

## 2）客户端示例（最小可用）

```ts
import { applyPatchesToNodes, type ChangeMeta, type NodePatch } from '@qiuyulc/infinite-map'

function onLocalPatches(patches: NodePatch[], meta: ChangeMeta) {
  // 1) 本地生效
  setNodes(prev => applyPatchesToNodes(prev, patches))

  // 2) 发到后端（示例）
  ws.send(JSON.stringify({ type: 'patches', patches, meta }))
}

function onRemotePatches(patches: NodePatch[], meta: ChangeMeta) {
  // 远端重放
  setNodes(prev => applyPatchesToNodes(prev, patches))
}
```

## 3）避免“回环应用”

协作接入里最常见的问题是：自己发出去的 patches 又从后端广播回来，导致重复 apply。

建议业务侧 envelope 加上：
- `clientId`
- `opId`（幂等去重）

收到远端消息时，如果 `clientId === myClientId`，则跳过或做幂等处理。

## 4）resources 的协作

`onPatches` 只覆盖 **nodes 变更**。如果你的业务数据放在 `resources`（例如图表数据/富文本），建议走单独的资源同步通道：
- doc 流：`NodePatch[]`（Infinite Map 负责生成）
- resource 流：业务自定义 `ResourcePatch[]`（业务自己同步与存储）

参考：[保存/加载（Doc & Resources）](/library/persistence)。

