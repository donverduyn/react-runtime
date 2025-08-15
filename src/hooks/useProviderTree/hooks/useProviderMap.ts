// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';
import type {
  DeclarationId,
  ProviderEntry,
  ProviderId,
  RuntimeModule,
  ScopeId,
} from 'types';

const createProviderMap = () => {
  const map = new Map<
    DeclarationId,
    Map<ProviderId, ProviderEntry<any, any>>
  >();
  const moduleMap = new Map<DeclarationId, Set<RuntimeModule<any>>>();
  const childToParent = new Map<DeclarationId, DeclarationId | null>();

  function register(
    id: DeclarationId,
    parentId: DeclarationId | null,
    entries: ProviderEntry<any, any>[]
  ) {
    if (!childToParent.has(id)) {
      childToParent.set(id, parentId);
    }
    if (!map.has(id)) {
      map.set(id, new Map());
      moduleMap.set(id, new Set());
    }
    const modules = moduleMap.get(id)!;
    entries.forEach((entry) => {
      if (entry.type === 'runtime' && !modules.has(entry.module)) {
        modules.add(entry.module);
      }
    });

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
      moduleMap.delete(id);
      childToParent.delete(id);
    }
  }
  function getById(id: DeclarationId | null) {
    return id ? (map.get(id) ?? null) : null;
  }
  function getModulesById(id: DeclarationId | null) {
    return id ? (moduleMap.get(id) ?? null) : null;
  }
  return {
    register,
    unregister,
    getById,
    getModulesById,
  };
};

const useProviderMapInstance = createSingletonHook(createProviderMap);

export const useProviderMap = (scopeId: ScopeId) => {
  return useProviderMapInstance(scopeId);
};
