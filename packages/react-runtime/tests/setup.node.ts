import { configure, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

configure({ reactStrictMode: true });

beforeEach(() => {
  // vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  // Clean up the DOM after all tests using Testing Library
  cleanup();
});
