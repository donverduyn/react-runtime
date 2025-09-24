import { configure, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

configure({ reactStrictMode: true });

afterEach(() => {
  vi.clearAllMocks();
  // Clean up the DOM after all tests using Testing Library
  cleanup();
});
