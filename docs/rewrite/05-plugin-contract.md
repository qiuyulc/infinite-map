# 05. 插件协议与扩展点（写成“库”，不是“业务”）

这一章目标：

> 你能解释：为什么要有 Plugin / Command / Store / Bus / Services 这几个东西，以及它们分别解决什么问题。

你可以把它们理解成 5 个“工具箱”：

```txt
Plugin    = 功能模块的外壳（可插拔）
Command   = “动作的名字”（UI 与实现解耦）
Store     = 插件之间共享的状态
Bus       = 插件之间共享的事件通知
Services  = 可替换的能力实现（camera/document/selection 等）
```

---

## 1) Plugin：为什么需要？

插件解决的是：

- 功能拆分（drag、selection、minimap…）
- 开关功能（用不用这功能就装不装）
- 控制事件优先级（谁先处理鼠标）

---

## 2) Command：为什么 UI 不直接写逻辑？

例子：右键菜单点“复制”。

你有两种写法：

### 写法 A（不推荐）：菜单里直接写复制逻辑

坏处：复制逻辑就被“菜单 UI”绑死了，工具栏/快捷键就要复制一份逻辑。

### 写法 B（推荐）：菜单触发 commandId

菜单只做：

```ts
runCommand('edit.copy')
```

真正逻辑在：

```ts
commands['edit.copy'].run(ctx)
```

好处：按钮/菜单/快捷键都复用同一个实现。

---

## 3) Store：为什么不用 React state？

因为插件不是 React 组件树的一部分，而且很多状态是“编辑器内部状态”：

- selection ids
- history stack
- minimap config / needsRedraw
- view config

用 store 可以让这些状态：

- 不依赖 props 层层传
- 不必触发整棵 React 树重渲染

---

## 4) Bus：为什么还要事件？

store 解决“存状态”，bus 解决“通知发生了什么”。

比如：

- selection 改了 → 发 `selection:change`
- camera 改了 → 发 `camera:changed`

订阅者（HUD/overlay）收到事件才刷新自己，这样更高效，也更语义化。

---

## 5) Services：为什么要可替换？

你未来很可能想替换某个能力的实现：

- camera.set：从“立即切换”升级成“带动画”
- document.applyPatches：从“本地修改”升级成“协作同步”
- selection：从“简单数组”升级成“带分组/锁定”

如果大家都 `import xxx` 互相调用，你就很难替换。

services 的好处：

> 只要大家都通过 `ctx.getService('camera')` 使用，相机实现就能随时换掉。

