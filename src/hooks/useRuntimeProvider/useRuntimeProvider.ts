import type { RegisterId, RuntimeInstance, RuntimeKey, ScopeId } from '@/types';
import type { DryRunApi } from 'hooks/useDryRun/factories/DryRunFactory';
import type { ProviderTreeApi } from 'hooks/useProviderTree/useProviderTree';
import { type TreeMapStore } from '../useTreeMap/useTreeMap';
import { useRuntimeRegistry } from './hooks/useRuntimeRegistry';

export const useRuntimeProvider = (
  scopeId: ScopeId,
  id: RegisterId,
  treeMap: TreeMapStore,
  providerTree: ProviderTreeApi,
  dryRunInstance: DryRunApi | null = null
) => {
  const registry = useRuntimeRegistry(scopeId);

  function getByKey(
    currentId: RegisterId = id,
    key: RuntimeKey,
    index: number = 0,
    snapshot?: ReturnType<typeof registry.getSnapshot> | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): [RuntimeInstance<any> | null, boolean] {
    const offTreeData = dryRunInstance
      ? Array.from(
          providerTree
            .resolveProviderData(currentId, dryRunInstance)[0]
            .values()
        )
      : [];
    let searchId: RegisterId | null = currentId;

    while (searchId !== null) {
      const result = registry.getById(searchId, key, index, snapshot);
      //* HAPPY PATH
      if (result) return [result, false];
      // current component did not have it, try its parent
      const parentId = treeMap.getParent(searchId);
      if (parentId !== '__ROOT__' && parentId !== null) {
        // pick up parentId in new round.
        searchId = parentId as unknown as RegisterId;
      } else if (parentId === '__ROOT__') {
        // look off-tree
        for (let i = 0; i < offTreeData.length; i++) {
          const entry = offTreeData[i];
          const result = registry.getById(entry.id, key, index);
          if (result) return [result, true];
        }

        searchId = null;
      } else {
        // drop out too
        searchId = null;
      }
    }
    // not found
    return [null, false];
  }

  return {
    gcUnpromoted: () => registry.gcUnpromoted(id),
    keepAlive: () => registry.keepAlive(id),
    promote: () => registry.promoteById(id),
    getByKey,
    getSnapshot: registry.getSnapshot,
    mergeIsolatedById: registry.mergeIsolatedById,
    register: registry.register,
    registerIsolated: registry.registerIsolated,
    // commitIsolatedById: registry.commitIsolatedById,
    gcIsolated: registry.gcIsolated,
    unregister: () => registry.unregister(id, () => treeMap.unregister(id)),
  };
};
