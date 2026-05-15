---
"@qiuyulc/infinite-map": patch
"@qiuyulc/infinite-map-editor": patch
---

- 选择交互：单击子节点自动提升到最外层 group，双击穿透选中子节点自身，Shift+单击提升后 toggle
- 编组提升：编组时自动将子节点提升到容器 group，支持嵌套 group 父子覆盖检查与外层提升
- 编组文档：补充 group 插件完整文档（选择交互、编组规则、service API、groupUtils 工具函数）
- 单元测试：新增 hitNormalize、groupPlugin、selectionPlugin 测试共 19 个用例
