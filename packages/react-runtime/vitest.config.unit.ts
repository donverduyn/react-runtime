import tsconfigPaths from 'vite-tsconfig-paths';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.test.json'] })],
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/*.integration.test.*',
      '**/*.e2e.test.*',
    ],
    include: ['**/*.test.{ts,tsx}'],
    // dir: '/packages/react-runtime',
    name: 'unit',
    setupFiles: ['./tests/setup.node.ts'],
  },
});
