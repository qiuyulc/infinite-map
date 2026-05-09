# npm 发版说明

本文整理本仓库当前的 npm 发版对象、前置准备、完整流程与常用命令。

本仓库使用：

- `Changesets`：管理版本与变更说明
- `GitHub Actions`：自动创建 Release PR 与发布到 npm

## 发版涉及的包

### `@qiuyulc/infinite-map`

核心无限画布渲染包，包含：

- `InfiniteMap` 组件
- engine/store/bus/runtime
- 基础类型、布局工具、文档序列化能力

### `@qiuyulc/infinite-map-editor`

编辑器插件与 UI 包，包含：

- 默认编辑器插件集合
- toolbar / context menu / rulers / minimap / zoom dock
- selection / drag / resize / rotate / snapping 等能力

## 第一次发版前要做的事

### 1. 确认 npm 包名可用

检查以下包名是否已被占用：

- `@qiuyulc/infinite-map`
- `@qiuyulc/infinite-map-editor`

可用下面命令检查：

```bash
npm view @qiuyulc/infinite-map
npm view @qiuyulc/infinite-map-editor
```

### 2. 登录 npm

```bash
npm login
npm whoami
```

### 3. 创建 npm token

在 npm 官网创建可发布包的 token，推荐 Automation token。

### 4. 配置 GitHub Secrets

在 GitHub 仓库中添加：

- `NPM_TOKEN`

说明：

- `GITHUB_TOKEN` 由 GitHub Actions 自动提供，用于创建/更新 Release PR
- `NPM_TOKEN` 用于真正发布到 npm

### 5. 确认默认分支

当前 release workflow 监听：

```yml
main
```

如果默认开发分支不是 `main`，需要先调整 workflow 或统一分支策略。

## 推荐发版流程（自动化）

这是日常最推荐的流程。

### 第 1 步：完成代码改动并本地校验

在仓库根目录执行：

```bash
pnpm install
pnpm check
```

`pnpm check` 会依次执行：

- `typecheck`
- `build`
- `test`
- `verify:exports`

### 第 2 步：为本次改动创建 changeset

```bash
pnpm changeset
```

然后按提示：

1. 选择本次需要发布的包
2. 选择版本等级：`patch` / `minor` / `major`
3. 填写本次变更说明

执行后会生成：

```bash
.changeset/*.md
```

这个文件需要提交到 git。

### 第 3 步：提交 PR 并合并到 `main`

合并到 `main` 后，GitHub 的 `Release` workflow 会自动运行。

### 第 4 步：自动创建或更新 Release PR

如果仓库里存在待发布的 changeset，workflow 会自动创建或更新一个 Release PR，标题类似：

```bash
chore: release packages
```

这个 PR 里会自动完成：

- 更新包版本号
- 更新内部依赖版本
- 更新 lockfile

### 第 5 步：检查并合并 Release PR

确认版本号与涉及包无误后，合并该 Release PR。

### 第 6 步：自动发布到 npm

Release PR 合并后，workflow 会再次触发并执行：

```bash
pnpm release
```

当前 `release` 脚本会执行：

```bash
pnpm check && changeset publish
```

成功后，这两个包会自动发布到 npm。

## 本地可用命令

```bash
# 新建一条发版说明
pnpm changeset

# 查看当前待发版状态
pnpm changeset:status

# 本地生成版本号与内部依赖版本更新
pnpm version-packages

# 本地执行完整发布（通常仅维护者手动发版时使用）
pnpm release
```

## 手动发版流程（备用）

如果临时不走 GitHub 自动化，也可以维护者本地手动发布：

### 1. 先生成版本

```bash
pnpm version-packages
```

### 2. 检查版本变更

```bash
git diff
```

确认版本号、内部依赖和 lockfile 没问题。

### 3. 手动发布

```bash
pnpm release
```

### 4. 提交版本结果

```bash
git add .
git commit -m "chore: release packages"
git push
```

## 版本选择建议

### `patch`

适用于：

- bug 修复
- 交互优化
- 文档补充
- 不影响现有 API 的小改动

### `minor`

适用于：

- 新增功能
- 新增命令/配置项/插件能力
- 保持向后兼容

### `major`

适用于：

- 破坏性 API 变更
- 默认行为变更且可能影响已有使用者
- 导出入口或包结构调整

## 注意事项

- `@qiuyulc/infinite-map-editor` 依赖 `@qiuyulc/infinite-map`，发布时会通过 Changesets 自动联动内部版本。
- 两个包都已配置 `publishConfig.access=public`，适用于公开 scoped package。
- 每次需要发布的改动都应附带 changeset；没有 changeset 就不会进入自动发版流程。
- 发布前建议至少本地执行一次 `pnpm check`。

## 一句话流程

日常发版只需要记住这 5 步：

1. 改代码
2. `pnpm changeset`
3. 提交并合并到 `main`
4. 合并自动生成的 Release PR
5. 等 GitHub 自动发布到 npm
