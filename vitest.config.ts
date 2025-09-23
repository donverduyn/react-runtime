import { defineConfig } from 'vitest/config';

export default defineConfig({
  appType: 'custom',
  server: {
    host: '0.0.0.0',
  },
  test: {
    css: false,
    globals: true,
    isolate: false,
    maxConcurrency: 1,
    open: false,
    projects: ['packages/*/vitest.config.*.ts'],
    coverage: { provider: 'v8', reporter: 'html' },
  },
});
