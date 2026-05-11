import { defineConfig, type Options } from 'tsup';
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function copyFilesByExt(fromDir: string, toDir: string, exts: Set<string>) {
  const walk = async (dir: string) => {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const it of items) {
      const abs = path.join(dir, it.name);
      if (it.isDirectory()) {
        await walk(abs);
        continue;
      }
      const ext = path.extname(it.name);
      if (!exts.has(ext)) continue;
      const rel = path.relative(fromDir, abs);
      const out = path.join(toDir, rel);
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.copyFile(abs, out);
    }
  };
  await walk(fromDir);
}

async function removeFilesByExt(dir: string, exts: Set<string>) {
  const walk = async (d: string) => {
    const items = await fs.readdir(d, { withFileTypes: true });
    for (const it of items) {
      const abs = path.join(d, it.name);
      if (it.isDirectory()) {
        await walk(abs);
        continue;
      }
      const ext = path.extname(it.name);
      if (!exts.has(ext)) continue;
      await fs.rm(abs);
    }
  };
  await walk(dir);
}

const baseConfig: Options = {
  // 源码级分发：每个源文件都作为 entry（类似 antd 的 es/lib）
  entry: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/__tests__/**',
  ],
  // npm 发布通常不需要 sourcemap，避免产物冗余；本地 watch 时开启便于调试
  sourcemap: process.argv.includes('--watch'),
  clean: true,
  external: ['react', 'react-dom'],
  bundle: false,
  splitting: false,
  minify: false,
  // 让 `tsup --watch` 生效
  watch: process.argv.includes('--watch'),
};

export default defineConfig([
  // ESM（es/）
  {
    ...baseConfig,
    outDir: 'es',
    format: ['esm'],
    dts: true,
    outExtension() {
      return { js: '.js' };
    },
    async onSuccess() {
      // 1) 复制 css（保持路径）
      await copyFilesByExt('src', 'es', new Set(['.css']));
      // 2) 发布产物不包含 sourcemap（即使某些环境仍会生成 .map，这里兜底清理）
      if (!process.argv.includes('--watch')) await removeFilesByExt('es', new Set(['.map']));
    },
  },
  // CJS（lib/）
  {
    ...baseConfig,
    outDir: 'lib',
    format: ['cjs'],
    dts: false,
    outExtension() {
      return { js: '.js' };
    },
    async onSuccess() {
      // 1) 复制 css
      await copyFilesByExt('src', 'lib', new Set(['.css']));
      // 2) 复制 d.ts（让 require 子路径也能获得类型提示）
      //    - d.ts 只由 es 构建产出一次，避免重复生成
      await copyFilesByExt('es', 'lib', new Set(['.d.ts', '.d.mts']));
      // 3) 清理 sourcemap
      if (!process.argv.includes('--watch')) await removeFilesByExt('lib', new Set(['.map']));
    },
  },
]);
