import type { ScopeId } from '@/types';

export const createSingletonHook = <T, A extends [ScopeId, ...unknown[]]>(
  create: (...args: A) => T
) => {
  const referenceMap = new Map<ScopeId, T>();
  return (...args: A | [ScopeId]) => {
    const scopeId = args[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!referenceMap.has(scopeId) && scopeId !== null) {
      referenceMap.set(scopeId, create(...(args as A)));
    }
    return referenceMap.get(scopeId)!;
  };
};
