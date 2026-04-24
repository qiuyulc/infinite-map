import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],

  use: {
    // macOS 上 Vite 可能优先绑定到 localhost(::1)，因此这里统一用 localhost
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    // 预览模式更接近真实发布环境（也避免 dev server 的 HMR 噪音）
    // 注意：这里的 cwd 是 playground 目录（执行 `pnpm -C playground e2e`），因此不要再写 `-C playground`
    // e2e 运行时需要 `@qiuyulc/infinite-map` 的 es/lib 产物存在（subpath exports 指向 es/ui/...）
    // 所以这里先构建依赖包，再构建 playground
    command: 'pnpm -C ../packages/infinite-map build && pnpm build && pnpm preview --host localhost --port 4173 --strictPort',
    url: 'http://localhost:4173',
    // 在 monorepo 本地跑 e2e 时，经常会已有 preview/dev server 占用端口
    // 这里统一复用已有服务，避免因为端口占用导致 e2e 直接失败
    reuseExistingServer: true,
    // 本地首次 build（尤其包含 dts）可能超过 2 分钟，这里放宽一点
    timeout: 300_000,
    // 把 webServer 输出透传出来，方便排查 build/preview 卡住的原因
    stdout: 'pipe',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
