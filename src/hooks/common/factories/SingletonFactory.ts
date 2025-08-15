import type { ScopeId } from 'types';

export const createSingletonHook = <T, A extends [ScopeId, ...unknown[]]>(
  create: (...args: A) => T
) => {
  const referenceMap = new WeakMap<ScopeId, T>();
  return (...args: A) => {
    const scopeId = args[0];
    if (!referenceMap.has(scopeId)) {
      referenceMap.set(scopeId, create(...args));
    }
    return referenceMap.get(scopeId)!;
  };
};
