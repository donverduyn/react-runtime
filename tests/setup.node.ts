import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react'

configure({ reactStrictMode: true });

// because uuid is not tree-shakeable with cjs
vi.mock('uuid', () => ({ v4: () => crypto.randomUUID() }));
