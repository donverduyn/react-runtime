import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// because uuid is not tree-shakeable with cjs
vi.mock('uuid', () => ({ v4: () => crypto.randomUUID() }));
