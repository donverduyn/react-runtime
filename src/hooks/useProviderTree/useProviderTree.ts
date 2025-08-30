// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComponentTreeApi } from 'hooks/useComponentTree/useComponentTree';
import type { DryRunApi } from 'hooks/useDryRun/factories/DryRunFactory';
import { useProviderMap } from 'hooks/useProviderTree/hooks/useProviderMap';
import type { TreeMapStore } from 'hooks/useTreeMap/useTreeMap';
import type {
  DeclarationId,
  ProviderEntry,
  ResolvedProviderEntry,
  ScopeId,
  RegisterId,
  ProviderId,
  RuntimeModule,
} from 'types';
import { createGhostRegisterId } from 'utils/hash';

export type ProviderTreeApi = {
  register: (
    id: DeclarationId,
    parentId: DeclarationId | null,
    entries: ProviderEntry<any, any>[]
  ) => void;
  resolveProviders: (
    id: RegisterId,
    rootEntries?: ProviderEntry<any, any>[]
  ) => Map<RegisterId, ResolvedProviderEntry<any, any, unknown>[]>;
  getById: (
    id: DeclarationId | null
  ) => Map<ProviderId, ProviderEntry<any, any>> | null;
  getModulesById: (id: DeclarationId | null) => Set<RuntimeModule<any>> | null;
  getParent: (id: DeclarationId) => DeclarationId | null;
  // getByKey: (
  //   currentId: RegisterId,
  //   key: string,
  //   index?: number
  // ) =>
};

export const useProviderTree = (
  scopeId: ScopeId,
  treeMap: TreeMapStore,
  componentTree: ComponentTreeApi,
  dryRunApi?: DryRunApi
): ProviderTreeApi => {
  const providerMap = useProviderMap(scopeId);

  function resolveProviders(id: RegisterId) {
    const seen = new Set<DeclarationId>();
    const unresolvedProviders = new Set<
      ProviderEntry<any, any> & { type: 'upstream' }
    >();

    function traverse(
      currentId: RegisterId,
      level: number
    ): Map<RegisterId, ResolvedProviderEntry<any, any, unknown>[]> {
      const declarationId = componentTree.getDeclarationId(currentId);
      if (!declarationId) throw new Error(noDeclarationMessage(currentId));
      if (seen.has(declarationId)) return new Map();
      seen.add(declarationId);

      const providers = providerMap.getById(declarationId);
      if (!providers || providers.size === 0) return new Map();

      const result = new Map<
        RegisterId,
        ResolvedProviderEntry<any, any, unknown>[]
      >();

      // Collect upstream maps and merge them in
      for (const entry of providers.values()) {
        if (entry.type === 'upstream') {
          const parentId = lookAhead(currentId, entry);
          if (!parentId) {
            throw new Error('No provider available for withUpstream');
          }
          if (parentId === '__ROOT__') {
            unresolvedProviders.add(entry);
          } else {
            const upstreamMap = traverse(
              parentId as unknown as RegisterId,
              level + 1
            );
            for (const [regId, entries] of upstreamMap.entries()) {
              if (!result.has(regId)) {
                result.set(regId, entries);
              }
            }
          }
        }
      }

      // Add current level providers under currentId
      let count = 0;
      const currentLevel: ResolvedProviderEntry<any, any, unknown>[] = [];
      for (const entry of providers.values()) {
        currentLevel.push(Object.assign(entry, { level, index: count }));
        count++;
      }
      if (currentLevel.length > 0) {
        result.set(currentId, currentLevel);
      }

      return result;
    }
    const onTreeProviders = traverse(id, 0);
    const [offTreeProviders, ancestors] =
      dryRunApi?.getResult(unresolvedProviders) ?? ([new Map(), []] as never);

    if (offTreeProviders.size > 0) {
      // providerMap.register
      // we need to look until we find something that is missing, then from that idx, go back from the decl ids and look for the first decl id that exists, then from there we update and register. we do this at every step to patch.
      Array.from(offTreeProviders.entries()).forEach(([declId, providers]) => {
        const registerId = componentTree.getInstanceIds(declId)[0];
        if (!registerId) {
          const ghostId = createGhostRegisterId();
          const ancestorIndex = ancestors.indexOf(declId);
          for (let i = ancestorIndex - 1; i >= 0; i--) {
            const descDeclId = ancestors[i];
            // note that the lower we go, the closer we get to the portable root declid, which always exists, because it registers before resolveProviders is called.
            const descRegId = componentTree.getInstanceIds(descDeclId)[0];
            for (let j = ancestorIndex + 1; j <= ancestors.length; j++) {
              const ascDeclId = ancestors[j] as DeclarationId | undefined;
              const ascRegId = ascDeclId
                ? componentTree.getInstanceIds(ascDeclId)[0]
                : null;
              if (descRegId) {
                // we update the descendent to point to the ghost id
                // then we register the ghost id to point to the next or __ROOT__ if it doesn't exist.
                treeMap.update(descRegId, ghostId);
                treeMap.register(
                  ghostId,
                  ascRegId ?? ('__ROOT__' as unknown as RegisterId)
                );
                componentTree.register(ghostId, declId);
                onTreeProviders.set(ghostId, providers);
                providerMap.register(declId, ascDeclId ?? null, providers);
                break;
              }
            }
            if (descRegId) break;
          }
        }
      });
    }
    return onTreeProviders;
  }

  function lookAhead(
    currentId: RegisterId,
    item: ProviderEntry<any, any> & { type: 'upstream' }
  ): RegisterId | null {
    const parentId = treeMap.getParent(currentId);
    if (parentId === '__ROOT__') return parentId;
    const parentDeclarationId = componentTree.getDeclarationId(parentId);
    const modules = providerMap.getModulesById(parentDeclarationId);
    if (!modules) return null;
    if (modules.size === 0) return null;

    return modules.has(item.module)
      ? parentId
      : lookAhead(parentId as unknown as RegisterId, item);
  }

  return {
    register: providerMap.register,
    resolveProviders,
    // getByKey: providerMap.getByKey,
    getParent: providerMap.getParent,
    getById: providerMap.getById,
    getModulesById: providerMap.getModulesById,
  };
};

export const getProviderTree = (
  scopeId: ScopeId,
  treeMap: TreeMapStore,
  componentTree: ComponentTreeApi
) => {
  return useProviderTree(scopeId, treeMap, componentTree);
};

const noDeclarationMessage = (id: RegisterId) =>
  `No declarationId found for component id: ${id}`;
