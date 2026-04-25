# Roadmap（作为三方库的优先级清单）

这份文件把 `docs/库化缺失项与优化清单.md` 里的方向变成更可执行的待办（按 P0/P1/P2）。

> 目标：让 `@qiuyulc/infinite-map` / `@qiuyulc/infinite-map-editor` 能被外部团队长期依赖：可保存/可升级/可诊断/可扩展。

---

## P0（必须：缺了不敢对外用）

### P0.1 Doc 持久化模型（schema + version + migrations）
- [x] `DOC_SCHEMA_VERSION` + `exportDoc/importDoc`（v1）
- [ ] 对外声明稳定字段 vs 实验字段（哪些字段允许宿主扩展）
- [ ] migrations：增加一个“真实的”迁移用例（例如 v2 改字段名/修正默认值）
- [ ] 文档：给出落盘示例（JSON）、以及迁移策略示例

### P0.2 受控模式与宿主 API（降低接入成本）
- [ ] `apiRef` 在无 plugins 时也可用（至少支持 `getCamera/setCamera/getNodes/exportDoc`）
- [ ] 选择/视图高频 API：
  - `getSelectedNodes()` / `setSelection(ids)`
  - `getSelectionBBox()`（用于对齐/分布/缩放等）
- [ ] 开发期告警：启用 plugins 但未提供 `onPatches/onNodesChange` 时提示“编辑不会生效”

### P0.3 测试与回归体系（核心逻辑兜底）
- [ ] undo/redo inverse patches 更强覆盖（move 合并、group 相关边界）
- [ ] 虚拟化/keepAlive 策略回归用例补齐
- [ ] gesture/hitTest 语义回归（锁定/隐藏/handle）

---

## P1（强烈建议：库质量关键）

### P1.1 错误边界与诊断工具
- [ ] 插件错误隔离：handler/gesture/overlay/command 统一捕获并上报（不拖垮整体）
- [ ] debug 开关：输出关键事件序列、耗时统计、可见节点数变化
- [ ] 性能指标：虚拟化耗时、overlay 绘制耗时、camera 更新频率

### P1.2 core / editor / ui-kit 边界更清晰
- [ ] core 尽量不强依赖 UI（默认行为中性、可裁剪）
- [ ] editor：只提供插件与算法，不强绑默认 UI
- [ ] ui-kit：toolbar/menu/minimap/rulers/zoomDock 等可选 UI

### P1.3 发布与升级保障
- [ ] CHANGELOG（明确 breaking）
- [ ] CI：typecheck + test + build（含 exports 子路径验证）
- [ ] 文档站点：更新日志/迁移指南入口

---

## P2（增强项：产品体验/生态）

### P2.1 基础编辑器标配能力
- [ ] 对齐/分布（Align/Distribute）命令（纯计算 + patches）
- [ ] 键盘移动（方向键/Shift 大步）+ Esc 退出交互
- [ ] 多选缩放/旋转的一致规则
- [ ] 导出 PNG（可作为可选插件）

### P2.2 协作路线
- [ ] patches 同步/合并策略（先定义接口/约束）
- [ ] CRDT/OT 的适配点（宿主侧实现为主）

