import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
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
