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

const baseConfig: Options = {
  // 源码级分发：每个源文件都作为 entry（类似 antd 的 es/lib）
  entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.test.*', '!src/**/*.spec.*'],
  sourcemap: true,
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
    },
  },
]);
