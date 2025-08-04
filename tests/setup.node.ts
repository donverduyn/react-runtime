import { configure, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// eslint-disable-next-line vitest/require-hook
configure({ reactStrictMode: true });

// because uuid is not tree-shakeable with cjs
vi.mock('uuid', () => ({ v4: () => crypto.randomUUID() }));

// eslint-disable-next-line vitest/require-top-level-describe
afterEach(() => {
  vi.clearAllMocks();
  // Clean up the DOM after all tests using Testing Library
  cleanup();
});
