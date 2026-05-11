import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/__tests__/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/__tests__/**',
        '**/index.ts',
        '**/index.tsx',
        '**/types.ts',
        '**/types.tsx',
        'src/demo/**',
        '**/*.css',
      ],
      thresholds: {
        lines: 75,
      },
    },
  },
});
