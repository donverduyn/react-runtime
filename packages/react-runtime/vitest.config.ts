import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.test.json'] })],

  server: { host: true },
  test: {
    css: false,
    isolate: false,
    maxConcurrency: 5,
    open: false,
    coverage: { provider: 'v8', reporter: 'html' },
    projects: ['./vitest.config.*.ts'],
  },
});
