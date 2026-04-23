import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // monorepo 本地开发：直接指向源码，避免必须先构建 es/lib 产物
      { find: '@qiuyulc/infinite-map/ui', replacement: path.resolve(__dirname, '../packages/infinite-map/src/ui/index.ts') },
      { find: '@qiuyulc/infinite-map/demo', replacement: path.resolve(__dirname, '../packages/infinite-map/src/demo/index.ts') },
      { find: '@qiuyulc/infinite-map', replacement: path.resolve(__dirname, '../packages/infinite-map/src/index.ts') },
    ],
  },
});
