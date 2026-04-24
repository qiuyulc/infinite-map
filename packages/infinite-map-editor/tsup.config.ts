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
  entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.test.*', '!src/**/*.spec.*'],
  sourcemap: process.argv.includes('--watch'),
  clean: true,
  external: ['react', 'react-dom'],
  bundle: false,
  splitting: false,
  minify: false,
  watch: process.argv.includes('--watch'),
};

export default defineConfig([
  {
    ...baseConfig,
    outDir: 'es',
    format: ['esm'],
    dts: true,
    outExtension() {
      return { js: '.js' };
    },
    async onSuccess() {
      await copyFilesByExt('src', 'es', new Set(['.css']));
      if (!process.argv.includes('--watch')) await removeFilesByExt('es', new Set(['.map']));
    },
  },
  {
    ...baseConfig,
    outDir: 'lib',
    format: ['cjs'],
    dts: false,
    outExtension() {
      return { js: '.js' };
    },
    async onSuccess() {
      await copyFilesByExt('src', 'lib', new Set(['.css']));
      await copyFilesByExt('es', 'lib', new Set(['.d.ts', '.d.mts']));
      if (!process.argv.includes('--watch')) await removeFilesByExt('lib', new Set(['.map']));
    },
  },
]);

