# Demo 与本地测试面板

仓库自带 playground，用于本地验证功能与回归。

## 启动 playground

```bash
pnpm -C playground dev
```

## 本地测试面板包含什么

左侧面板提供可视化开关，用于验证：
- HUD 组件（rulers / minimap / zoom dock / toolbar / context menu）
- 虚拟化与 keepAlive（重组件节点）
- `editMode` / `editable` 的行为（readonly/controlled/auto）
- 变更出口（onNodesChange / onPatches / both / none）
- Doc 导入/导出（通过 apiRef.exportDoc/importDoc）

## 建议的手动测试用例

1. `editMode="controlled" + onPatches`：拖拽/缩放/旋转应生效；last patches 有计数
2. `editMode="auto" + 变更出口=none`：表现为预览（无 selection/框选/右键/工具栏/对齐线）
3. `editMode="readonly"`：同上，但 pan/zoom 仍可用
4. 导出 doc → 清空 nodes → 导入 doc，应恢复节点与相机

