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
    maxConcurrency: 5,
    open: false,
    exclude: ['**/.*/**/*', '**/playwright-report', 'test-results'],
    projects: ['packages/*/vitest.config.*.ts'],
    coverage: { provider: 'v8', reporter: 'html' },
  },
});
