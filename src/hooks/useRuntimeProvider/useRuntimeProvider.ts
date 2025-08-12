import type { ComponentId, RuntimeInstance, RuntimeKey } from 'types';
import { type TreeMapStore } from '../useTree/useTree';
import { useRuntimeRegistry } from './hooks/useRuntimeRegistry';

// provides an endpoint to obtain runtimes imperatively
export const useRuntimeProvider = (id: ComponentId, treeMap: TreeMapStore) => {
  const registry = useRuntimeRegistry();

  function getByKey(
    currentId: ComponentId = id,
    key: RuntimeKey,
    index: number = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): RuntimeInstance<any> | null {
    const value = registry.getById(currentId, key, index);
    if (value) return value;
    const parentId = treeMap.getParent(currentId);

    const result =
      parentId !== '__ROOT__' && parentId !== null
        ? getByKey(parentId as unknown as ComponentId, key)
        : null;

    return result;
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
