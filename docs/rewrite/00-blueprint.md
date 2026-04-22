# 00. 总蓝图（从 0 重写一遍）

你现在的目标不是“把这个项目重写出来上线”，而是：

> 用一次“从 0 重写”的过程，把你现在这份库的思路彻底吃透，最终能在面试里讲清楚：你做了一个可扩展的无限画布编辑器内核。

所以这套文档会按下面的方式写：

- **每一章都有：目标 → 你要写哪些文件 → 最小可跑示例 → 你应该能讲出来的一句话**
- **每一个功能都有：用户操作 → 数据怎么变 → 哪个模块负责 → 伪代码 → 怎么验证**

---

## 1) 你要重写的“最终形态”是什么？

一句话：

> 一个 React + TypeScript 的三方库：提供 `<InfiniteMap />` + 一套 Editor 插件系统，让使用者按需组合拖拽/框选/右键菜单/小地图/缩放条等能力。

---

## 2) 分层设计（这是你面试时的主线）

```txt
Layer A：Core（纯数据/算法）
  - NodeData / Camera / 坐标换算 / 空间索引 / Patch

Layer B：Editor Runtime（能力装配器）
  - Plugin 合并、输入事件分发、Command 注册与触发、Store/Bus/Services

Layer C：UI（React 组件）
  - InfiniteMap（背景 + 节点渲染 + overlay/hud 分层）
  - 默认 HUD：toolbar / contextmenu / minimap / zoomDock / rulers
```

你写代码时也要按这个分层来写：**越底层越少依赖 React**。

---

## 3) 项目结构建议（保持你现在的栈）

monorepo：

```txt
packages/infinite-map/   # 库本体（对外发布）
playground/              # demo（永远能跑）
docs/                    # 文档（边写边补）
```

库内部（建议）：

```txt
src/
  core/        # 纯类型与算法（尽量无 React）
  editor/      # 插件化编辑器 runtime（尽量少 React）
  components/  # React 组件（InfiniteMap/DefaultNode/Minimap/Slider）
  hooks/       # React hooks（wheel/pan/viewport 等）
  theme.ts     # 主题变量映射
  index.ts     # 对外导出
```

---

## 4) 里程碑（你可以按这个顺序实现）

> 不要求一次性写完。每个里程碑都能跑 demo，并且有“可展示的成果”。

### Milestone 0：能显示（不含编辑）
- [ ] `<InfiniteMap />` 能渲染背景 + nodes（固定位置）
- [ ] 支持 grid/dots 背景切换

### Milestone 1：能移动视图（camera）
- [ ] wheel 缩放
- [ ] pointer 平移（例如 Space + drag）

### Milestone 2：能编辑节点（最小 editor）
- [ ] selection（点选、多选）
- [ ] drag（拖拽移动）
- [ ] resize（缩放尺寸）

### Milestone 3：编辑体验完善（可讲亮点）
- [ ] history（undo/redo）
- [ ] clipboard（copy/paste/duplicate）
- [ ] zIndex（上移/下移/置顶/置底）
- [ ] view commands（fit/center/zoom）

### Milestone 4：HUD（可视化 + 更像“编辑器产品”）
- [ ] toolbar
- [ ] context menu（右键）
- [ ] minimap
- [ ] zoomDock
- [ ] rulers

---

## 5) 你面试时怎么讲（提前埋点）

你要能用 30 秒讲清楚 3 句话：

1) **我做了什么**：我实现了一个插件化的无限画布编辑器内核（React + TS）。  
2) **难点在哪**：输入事件与多种能力（拖拽/框选/吸附/右键/HUD）会互相抢事件，所以必须插件化 + 分层 + 可组合。  
3) **我怎么解决**：用 Plugin/Command/Store/Bus/Services 解耦 UI 与行为，把核心变更统一到 Patch 管道，保证可扩展与可维护。

后面第 07 章会把“亮点故事”写成一份可直接背的面试稿。

