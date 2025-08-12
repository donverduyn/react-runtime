import { describe, it, expect } from 'vitest';
import { ROOT_NS, combineV5 } from './hash';

describe('parent-first ids', () => {
  // it('edge is determined by immediate parent + ordinal', () => {
  //   const e1 = edgeSigV5('Child', 'C1', 'Parent', 'A', 0);
  //   const e2 = edgeSigV5('Child', 'C1', 'Parent', 'A', 0);
  //   const e3 = edgeSigV5('Child', 'C1', 'Parent', 'B', 0);
  //   const e4 = edgeSigV5('Child', 'C1', 'Parent', 'A', 1);

  //   expect(e1).toBe(e2);
  //   expect(e1).not.toBe(e3); // different parent inst
  //   expect(e1).not.toBe(e4); // different ordinal
  // });

  it('combine accumulates along the path', () => {
    const root = ROOT_NS;
    const n1 = combineV5(root, 'Root', 'R', 0);
    const n2 = combineV5(n1, 'Child', 'C1', 0);
    const n3 = combineV5(n2, 'Leaf', 'L', 0);
    expect(n1).not.toBe(n2);
    expect(n2).not.toBe(n3);
  });
});
