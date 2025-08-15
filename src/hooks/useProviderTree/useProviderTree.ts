// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TreeMapStore } from 'hooks/useTreeMap/useTreeMap';
import type {
  ComponentId,
  DeclarationId,
  ParentId,
  ProviderEntry,
  ResolvedProviderEntry,
  ScopeId,
} from 'types';
import { useComponentMap } from './hooks/useComponentMap';
import { useProviderMap } from './hooks/useProviderMap';

export const useProviderTree = (scopeId: ScopeId, treeMap: TreeMapStore) => {
  const componentMap = useComponentMap(scopeId);
  const providerMap = useProviderMap(scopeId);

  function resolveUpstream(id: ComponentId) {
    const seen = new Set<DeclarationId>();
    // console.log('resolveUpstream', id);
    function traverse(
      currentId: ComponentId,
      level: number
    ): ResolvedProviderEntry<any, any, unknown>[] {
      const declarationId = componentMap.getDeclarationId(currentId);
      if (!declarationId) throw new Error(noDeclarationMessage(currentId));
      if (seen.has(declarationId)) return [];
      seen.add(declarationId);

      const providers = providerMap.getById(declarationId);
      if (!providers) return [];
      if (providers.size === 0) return [];

      const upstream: ResolvedProviderEntry<any, any, unknown>[][] = [];
      const currentLevel: ResolvedProviderEntry<any, any, unknown>[] = [];

      let count = 0;
      for (const entry of providers.values()) {
        if (entry.type === 'upstream') {
          const parentId = lookAhead(currentId, entry);
          if (!parentId)
            throw new Error('No provider available for withUpstream');
          upstream.push(
            traverse(parentId as unknown as ComponentId, level + 1)
          );
        }
        currentLevel.push(Object.assign(entry, { level, index: count }));
        count++;
      }

      const collected = upstream.flatMap((item) => item).concat(currentLevel);
      return collected;
    }
    return traverse(id, 0);
  }

  function lookAhead(
    currentId: ComponentId,
    item: ProviderEntry<any, any> & { type: 'upstream' }
  ): ParentId | null {
    const parentId = treeMap.getParent(currentId);
    const parentDeclarationId = componentMap.getDeclarationId(
      parentId as ComponentId | null
    );
    const modules = providerMap.getModulesById(parentDeclarationId);
    if (!modules) return null;
    if (modules.size === 0) return null;

    return modules.has(item.module)
      ? parentId
      : lookAhead(parentId as unknown as ComponentId, item);
  }

  function register(
    id: ComponentId,
    declarationId: DeclarationId,
    entries: ProviderEntry<any, any>[]
  ) {
    const parentId = treeMap.getParent(id) as ComponentId | null;
    const parentDeclarationId = componentMap.getDeclarationId(parentId);
    if (parentId !== '__ROOT__' && !parentDeclarationId)
      throw new Error(noDeclarationMessage(id));

    componentMap.register(id, declarationId);
    providerMap.register(declarationId, parentDeclarationId, entries);
  }

  return {
    register,
    resolveUpstream,
  };
};

const noDeclarationMessage = (id: ComponentId) =>
  `No declarationId found for component id: ${id}`;
