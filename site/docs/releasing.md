# 发布指南

## 首次发布（手动）

首次发布版本号就是最终版本号，不需要 changeset bump：

```bash
# 1. 删掉 changeset 文件（首发不需要）
rm .changeset/*.md

# 2. 全量校验
pnpm check

# 3. 登录 npm
npm login

# 4. 发布两个包
cd packages/infinite-map && npm publish --access public
cd ../infinite-map-editor && npm publish --access public
```

> npm 首次发布 scoped package（`@qiuyulc/*`）可能会报 403，稍等几秒重试即可。

---

## 后续自动发布（推荐）

通过 Changesets + GitHub Actions 全自动发布，核心流程：

```bash
# 1. 写代码 & 本地校验
pnpm check

# 2. 写 changeset
pnpm changeset
```

交互式选择：
- 选要发布的包（空格切换）
- 选 bump 类型：`patch`（修 bug）/ `minor`（新功能）/ `major`（破坏性变更）
- 写变更描述（中英文均可）

执行后生成 `.changeset/xxx.md`。

```bash
# 3. 提交 & 推送
git add .
git commit -m "chore: add changeset"
git push
```

推送后 GitHub Actions 自动：

1. 创建 `chore: release packages` PR
2. PR 内自动更新版本号、CHANGELOG、内部依赖版本、lockfile
3. 合并该 PR 后自动发布到 npm

**不需要手动改版本号，不需要手动发布。**

---

## 手动发布（备用）

如果 CI 不可用：

```bash
# 1-2 同上（pnpm check + pnpm changeset）

# 3. 本地生成版本
pnpm version-packages

# 4. 本地发布
pnpm release

# 5. 提交版本变更
git add . && git commit -m "chore: release packages" && git push
```

---

## Bump 类型选择

| 类型 | 示例 | 适用 |
|---|---|---|
| `patch` | `0.0.1` → `0.0.2` | bug 修复、文档修正、不影响 API 的小改动 |
| `minor` | `0.0.1` → `0.1.0` | 新功能、新命令、新插件能力（保持向后兼容） |
| `major` | `0.1.0` → `1.0.0` | 破坏性 API 变更、默认行为改变 |

---

## 发布前检查清单

- [ ] `pnpm check` 全部通过（typecheck + build + test + verify:exports）
- [ ] 两包 `CHANGELOG.md` 存在（`packages/*/CHANGELOG.md`）
- [ ] `.changeset/config.json` 中 `changelog` 不是 `false`
- [ ] GitHub Actions 权限：Settings → Actions → General → Read and write + Allow PR creation
- [ ] GitHub Secrets 有 `NPM_TOKEN`

---

## 相关文件

- `.changeset/config.json` — Changesets 配置
- `.github/workflows/release.yml` — CI 发布流水线
- `packages/*/CHANGELOG.md` — 各包自动生成的变更日志
- `RELEASING.md` — 详细发版说明（备查）
