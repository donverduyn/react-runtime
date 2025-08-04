import moize from 'moize';
import type { RuntimeInstance } from 'components/common/types';
import { useTreeMap } from '../useTreeMap/useTreeMap';
import { useRuntimeRegistry as useRuntimeRegistry } from './hooks/useRuntimeRegistry';
import type { ComponentId, RuntimeKey } from './types';

// provides an endpoint to obtain runtimes imperatively
export const useRuntimeProvider = (id: ComponentId, isDryRun: boolean) => {
  const treeMap = useTreeMap(id, isDryRun);
  const registry = useRuntimeRegistry();

  function getByKey(
    currentId: ComponentId = id,
    key: RuntimeKey
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): RuntimeInstance<any> | null {
    const parentId = treeMap.getParent(currentId);
    const value = registry.getById(
      parentId === null ? currentId : parentId,
      key
    );

    const result =
      value && parentId
        ? getByKey(parentId as unknown as ComponentId, key)
        : null;

    return result;
  }

  return {
    getByKey,
    register: registry.register.bind(registry),
    unregister: () => registry.unregister(id, () => treeMap.unregister(id)),
    isRoot: moize(() => treeMap.isRoot(id)),
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
