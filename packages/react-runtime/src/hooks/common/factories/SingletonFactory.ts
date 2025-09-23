// export const createSingletonHook = <T, A extends [ScopeId, ...unknown[]]>(
//   create: (...args: A) => T
// ) => {
//   const referenceMap = new Map<ScopeId, T>();
//   return (...args: A | [ScopeId]) => {
//     const scopeId = args[0];
//     // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
//     if (!referenceMap.has(scopeId) && scopeId !== null) {
//       referenceMap.set(scopeId, create(...(args as A)));
//     }
//     return referenceMap.get(scopeId)!;
//   };
// };

import type { ScopeId } from '@/types';

function getRegistryMap<T>(factoryKey: string): Map<string, T> {
  const g = globalThis as unknown as {
    __singletonStores: Record<string, unknown> | undefined;
  };
  if (!g.__singletonStores) g.__singletonStores = {};
  if (!g.__singletonStores[factoryKey])
    g.__singletonStores[factoryKey] = new Map();
  return g.__singletonStores[factoryKey] as Map<string, T>;
}

export const createSingletonHook = <T, A extends [ScopeId, ...unknown[]]>(
  create: (...args: A) => T
) => {
  const derivedKey = `factory:${create.name || 'anon'}`; // not perfectly stable
  const registry = getRegistryMap<T>(derivedKey);

  const hook = (...args: A | [ScopeId]) => {
    const scopeId = args[0];
    if (scopeId && !registry.has(scopeId))
      registry.set(scopeId, create(...(args as A)));
    return registry.get(scopeId)!;
  };

  hook.getByKey = (scopeId: string) => registry.get(scopeId);
  // hook.disposeByKey = (scopeId: string) => {
  //   const inst = registry.get(scopeId);
  //   if (inst && typeof (inst as any).dispose === 'function') (inst as any).dispose();
  //   registry.delete(scopeId);
  // };

  return hook;
};
