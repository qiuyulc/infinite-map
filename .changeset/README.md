# Changesets

本仓库使用 Changesets 管理 npm 包版本与自动发布。

常用命令：

```bash
# 为本次变更写一条发版记录
pnpm changeset

# 查看当前待发版状态
pnpm changeset:status

# 本地生成版本号与 changelog/依赖更新（通常由 CI 执行）
pnpm version-packages
```

自动化流程：

1. 开发者提交功能后运行 `pnpm changeset`
2. 合并到 `main` 后，GitHub Action 自动创建/更新 Release PR
3. 合并 Release PR 后，GitHub Action 自动发布到 npm
