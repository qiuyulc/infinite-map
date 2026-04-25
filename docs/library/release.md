# 发布流程（最小闭环）

目标：让版本发布可重复、可回滚、可审计（CI 兜底），不依赖“凭记忆操作”。

> 这里假设发布到 npm（public）。若你使用私有 registry，把 `--access public` 等参数按需调整。

---

## 0）约定

- 版本遵循 SemVer：`MAJOR.MINOR.PATCH`
- Doc schema 通过 `schemaVersion` 独立演进（见：[Doc schema 与迁移](/library/doc-schema)）
- monorepo 内两个包：
  - `packages/infinite-map` → `@qiuyulc/infinite-map`
  - `packages/infinite-map-editor` → `@qiuyulc/infinite-map-editor`

---

## 1）发布前检查（本地）

```bash
pnpm install
pnpm run check
pnpm -C docs build
```

`pnpm run check` 会执行：typecheck + build + test + verify:exports。

---

## 2）更新版本号

在以下文件中同步更新版本号：

- `packages/infinite-map/package.json#version`
- `packages/infinite-map-editor/package.json#version`
- `packages/infinite-map-editor/package.json#peerDependencies[@qiuyulc/infinite-map]`（如需）

然后更新：
- `CHANGELOG.md`：把本次变更从 Unreleased 下沉到对应版本

建议提交信息：
```
chore(release): bump versions to x.y.z
```

---

## 3）构建产物（发布前）

```bash
pnpm -C packages/infinite-map build
pnpm -C packages/infinite-map-editor build
pnpm verify:exports
```

---

## 4）发布到 npm

确保你已登录：
```bash
npm whoami
```

按顺序发布（先 core 再 editor）：
```bash
pnpm -C packages/infinite-map publish --access public
pnpm -C packages/infinite-map-editor publish --access public
```

---

## 5）打 tag / release

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

（可选）在 GitHub Release 中粘贴本次 CHANGELOG 条目。

---

## 6）发布后验证

在一个干净目录里验证安装与 types：

```bash
mkdir /tmp/infinite-map-smoke && cd /tmp/infinite-map-smoke
pnpm init
pnpm add react react-dom @qiuyulc/infinite-map@X.Y.Z @qiuyulc/infinite-map-editor@X.Y.Z
```

然后做一次简单的 `import`/`typecheck` smoke test 即可。

