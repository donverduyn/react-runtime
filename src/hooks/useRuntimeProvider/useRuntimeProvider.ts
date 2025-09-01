import type { RegisterId, RuntimeInstance, RuntimeKey, ScopeId } from '@/types';
import type { ComponentTreeApi } from 'hooks/useComponentTree/useComponentTree';
import type { ProviderTreeApi } from 'hooks/useProviderTree/useProviderTree';
import { type TreeMapStore } from '../useTreeMap/useTreeMap';
import { useRuntimeRegistry } from './hooks/useRuntimeRegistry';

// provides an endpoint to obtain runtimes imperatively
export const useRuntimeProvider = (
  scopeId: ScopeId,
  id: RegisterId,
  treeMap: TreeMapStore,
  componentTree: ComponentTreeApi,
  providerTree: ProviderTreeApi
) => {
  const registry = useRuntimeRegistry(scopeId);

  function getByKey(
    currentId: RegisterId = id,
    key: RuntimeKey,
    index: number = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): RuntimeInstance<any> | null {
    let searchId: RegisterId | null = currentId;

    while (searchId !== null) {
      const result = registry.getById(searchId, key, index);
      if (result) return result;

      const parentId = treeMap.getParent(searchId);

      if (parentId !== '__ROOT__' && parentId !== null) {
        // try resolving at the parent
        searchId = parentId as unknown as RegisterId;
      } else if (parentId === '__ROOT__') {
        // drop out
        searchId = null;
      } else {
        // drop out too
        searchId = null;
      }
    }

    return null;
  }

  return {
    gcUnpromoted: () => registry.gcUnpromoted(id),
    keepAlive: () => registry.keepAlive(id),
    promote: () => registry.promoteById(id),
    getByKey,
    register: registry.register,
    unregister: () => registry.unregister(id, () => treeMap.unregister(id)),
  };
};

/**
 * Hook to traverse up the tree and find a reference for a symbol in the runtime store.
 * @param startId The id to start searching from (usually the current component id)
 * @param symbol The symbol to look for in the runtime store
 * @param getRuntimeRegistry A function that returns the runtime store (Map<string, Record<string, any>>)
 * @returns The found reference or undefined
 */
// export function useFindUpTree(
//   startId: string,
//   symbol: string,
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   getRuntimeRegistry: () => Map<string, Record<string, any>>
// ) {
//   const treeMap = useTreeMap().getSnapshot();
//   let currentId: string | null = startId;
//   const registry = getRuntimeRegistry();

//   while (currentId) {
//     const runtimeEntry = registry.get(currentId);
//     if (runtimeEntry && symbol in runtimeEntry) {
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//       return runtimeEntry[symbol];
//     }
//     const parentNode = treeMap.get(currentId);
//     currentId = parentNode?.id ?? null;
//   }
//   return undefined;
// }
