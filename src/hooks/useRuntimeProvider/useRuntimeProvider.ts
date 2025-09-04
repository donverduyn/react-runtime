import type { RegisterId, RuntimeInstance, RuntimeKey, ScopeId } from '@/types';
import { type TreeMapStore } from '../useTreeMap/useTreeMap';
import { useRuntimeRegistry } from './hooks/useRuntimeRegistry';

export const useRuntimeProvider = (
  scopeId: ScopeId,
  id: RegisterId,
  treeMap: TreeMapStore
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