// packages/ui/playwright.config.ts
import { defineConfig } from '@playwright/test';
import baseConfig from '../../playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: './tests',
  testIgnore: '**/tests/artifacts/**',
});
