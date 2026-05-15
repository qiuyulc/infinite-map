---
"@qiuyulc/infinite-map": major
"@qiuyulc/infinite-map-editor": major
---

相机坐标系从视口左上角改为视口中心原点，解决编辑/预览切换时节点偏移问题。

破坏性变更:
- Camera.x/y 语义变更: 从视口左上角世界坐标 → 视口中心世界坐标
- DOC_SCHEMA_VERSION 1 → 2，旧文档无法加载
- initialCamera 默认值变更
- cameraToTransform 签名增加 viewport 参数
- useCoordinateTransforms / useWheelControls 需要透传 viewportRef
