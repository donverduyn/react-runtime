import tsconfigPaths from 'vite-tsconfig-paths';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.test.json'] })],
  test: {
    // browser: {
    //   api: { host: '0.0.0.0', port: 63315 },
    //   enabled: true,
    //   headless: true,
    //   instances: [{ browser: 'firefox' }],
    //   isolate: true,
    //   provider: 'playwright',
    //   ui: true,
    // },
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.integration.test.{ts,tsx}'],
    exclude: ['**/node_modules/**'],
    name: 'integration',
    setupFiles: ['./tests/setup.node.ts'],
  },
});
