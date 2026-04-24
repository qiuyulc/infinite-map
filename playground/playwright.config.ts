import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    // 预览模式更接近真实发布环境（也避免 dev server 的 HMR 噪音）
    // 注意：这里的 cwd 是 playground 目录（执行 `pnpm -C playground e2e`），因此不要再写 `-C playground`
    // e2e 运行时需要 `@qiuyulc/infinite-map` 的 es/lib 产物存在（subpath exports 指向 es/ui/...）
    // 所以这里先构建依赖包，再构建 playground
    command: 'pnpm -C ../packages/infinite-map build && pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    // 在 monorepo 本地跑 e2e 时，经常会已有 preview/dev server 占用端口
    // 这里统一复用已有服务，避免因为端口占用导致 e2e 直接失败
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
