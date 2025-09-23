// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSingletonHook } from '@/hooks/common/factories/SingletonFactory';
import type {
  DeclarationId,
  ProviderEntry,
  ProviderId,
  RuntimeContext,
  ScopeId,
} from '@/types';

const createProviderMap = () => {
  const map = new Map<
    DeclarationId,
    Map<ProviderId, ProviderEntry<any, any>>
  >();

  function register(id: DeclarationId, entries: ProviderEntry<any, any>[]) {
    if (!map.has(id)) {
      map.set(id, new Map());
    }

    const entryMap = map.get(id)!;
    entries.forEach((entry) => {
      if (!entryMap.has(entry.id)) {
        entryMap.set(entry.id, entry);
      }
    });
  }

  // this only needs to happen on fast refresh
  function unregister(id: DeclarationId) {
    if (map.has(id)) {
      map.delete(id);
    }
  }

  function getModulesById(id: DeclarationId) {
    const entryMap = map.get(id)!;
    return Array.from(entryMap.values()).reduce(
      (set, entry) => (entry.type === 'runtime' ? set.add(entry.module) : set),
      new Set<RuntimeContext<any>>()
    );
  }

  return {
    register,
    unregister,
    getModulesById,
  };
};

const useProviderMapInstance = createSingletonHook(createProviderMap);

export const useProviderMap = (scopeId: ScopeId) => {
  return useProviderMapInstance(scopeId);
};
