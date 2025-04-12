import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      include: ['**/*.e2e.test.{ts,tsx}'],
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
  },
  {
    extends: './vitest.config.ts',
    test: {
      environment: 'happy-dom',
      include: ['**/*.integration.test.{ts,tsx}'],
      name: 'integration',
      setupFiles: ['./test/setup.node.ts'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      environment: 'node',
      exclude: ['**/*.integration.test.*', '**/*.e2e.test.*'],
      include: ['**/*.test.{ts,tsx}'],
      name: 'unit',
      setupFiles: ['./test/setup.node.ts'],
    },
  },
]);
