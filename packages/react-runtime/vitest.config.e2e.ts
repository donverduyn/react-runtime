import tsconfigPaths from 'vite-tsconfig-paths';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.test.json'] })],
  test: {
    name: 'e2e',
    include: ['!**/*'], //'**/*.e2e.test.{ts,tsx}'],
    exclude: ['**/node_modules/**'],
    browser: {
      api: { host: '0.0.0.0', port: 63315 },
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium' }],
      isolate: false,
      provider: 'playwright',
      ui: true,
    },
  },
});
