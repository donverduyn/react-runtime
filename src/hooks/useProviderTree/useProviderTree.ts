// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import { identity } from 'effect';
import type {
  DeclarationId,
  ProviderEntry,
  ScopeId,
  RegisterId,
  RuntimeModule,
  RuntimeContext,
} from '@/types';
import type { ComponentInstanceApi } from 'hooks/useComponentInstance/useComponentInstance';
import type { DryRunCandidateAncestor } from 'hooks/useDryRun/factories/DryRunCandidate';
import { type DryRunApi } from 'hooks/useDryRun/useDryRun';
import { useProviderMap } from 'hooks/useProviderTree/hooks/useProviderMap';
import type { TreeMapStore } from 'hooks/useTreeMap/useTreeMap';
import { tryFnSync } from 'utils/function';
import { createGhostId } from 'utils/hash';

export type ProviderTreeApi = {
  register: (id: DeclarationId, providers: ProviderEntry<any, any>[]) => void;
  getRoot: (dryRunInstance: DryRunApi) => DryRunCandidateAncestor;
  getRootAncestors: (
    dryRunInstance: DryRunApi
  ) => Map<RegisterId, DryRunCandidateAncestor>;
  resolveProviderData: (
    id: RegisterId,
    dryRunInstance: DryRunApi,
    initialModules?: Set<RuntimeContext<any>>
  ) => readonly [
    Map<RegisterId, DryRunCandidateAncestor>,
    DryRunCandidateAncestor,
  ];
};

// TODO: make this part of useDryRun, because it only resolves off-tree data, and avoids coupling between hook modules.

export const useProviderTree = (
  scopeId: ScopeId,
  treeMap: TreeMapStore,
  componentInstanceApi: ComponentInstanceApi
): ProviderTreeApi => {
  const providerMap = useProviderMap(scopeId);

  function getRoot(dryRunInstance: DryRunApi) {
    const root = dryRunInstance.getRoot();
    return Object.assign({}, root, { id: createGhostId(root.id) });
  }

  // TODO: getRootAncestors now returns the same as getOffTreeData, albeit in a map. we should clean this up.
  function getRootAncestors(dryRunInstance: DryRunApi) {
    const root = dryRunInstance.getRoot();
    const allAncestors = dryRunInstance.getRootAncestors();
    const rootAncestors = allAncestors.slice(
      allAncestors.findIndex((a) => a.id === root.id) + 1
    );

    return rootAncestors.reduce((map, entry) => {
      const id = createGhostId(entry.id) as RegisterId;
      return map.set(id, { ...entry, id });
    }, new Map<RegisterId, DryRunCandidateAncestor>());
  }

  // TODO: the problem with the current implementation is that it offloads traversal to the dry run api, but it works on static data, while we need to take into account that the upstreamModules can change and have to be read from componentInstanceApi. So we have to do the traversal in provider tree, but use the same logic as in dry run api
  function resolveProviderData(
    id: RegisterId,
    dryRunInstance: DryRunApi,
    initialModules?: Set<RuntimeContext<any>>
  ) {
    const unresolvedModules = collectUnresolved(id, 0, initialModules);

    // this is now all the nodes
    const [offTreeData, candidate, isStructuralMatch] =
      dryRunInstance.getOffTreeData(unresolvedModules);

    const ancestors = offTreeData.values().reduce((array, ancestor) => {
      const id = createGhostId(ancestor.id) as RegisterId;
      array.push(
        Object.assign({}, ancestor, {
          upstreamModules: componentInstanceApi.getUpstreamById(id),
          id,
        })
      );
      return array;
    }, [] as DryRunCandidateAncestor[]);

    // TODO: consider that if we don't have a structural match, that we also do not have any props to mock, which means, that all expected props must be provided by the user from the original component.

    const result = isStructuralMatch
      ? tryFnSync(() => extractProviders(ancestors, unresolvedModules))
      : extractProviders(ancestors, unresolvedModules);

    if (!result) {
      throw new Error(
        "Couldn't resolve upstream dependencies as a direct descendent of the root. If the provided root does render your component through children, you can provide children to the root, via the second argument in of withProviderScope"
      );
    }

    const rootData = result.get(candidate.self.registerId)!;
    return [result, rootData] as const;
  }

  function collectUnresolved(
    currentId: RegisterId,
    level: number = 0,
    initialModules?: Set<RuntimeContext<any>>,
    unresolved = new Set<RuntimeContext<any>>(),
    seen = new Set<RegisterId>()
  ): Set<RuntimeContext<any>> {
    if (seen.has(currentId)) return unresolved;
    seen.add(currentId);

    const upstreamModules =
      level === 0 && initialModules
        ? initialModules
        : new Set(
            // we rely on the registered upstreamModules, to traverse upwards until we reach __ROOT__. Even if modules can be resolved off-tree we treat them as unresolved, because we want a deterministic way to retrieve off-tree nodes.

            // but this also makes me think, that we might not want to rely on the dry run results, itself for traversal, because off-tree nodes their modules can also change and therefore it would make more sense to also read from componentInstanceApi when we go off-tree during traversal.
            (
              componentInstanceApi.getUpstreamById(currentId) ??
              (new Map() as never)
            )
              .values()
              .flatMap(identity)
          );
    if (upstreamModules.size === 0) return unresolved;

    // Collect upstream maps and merge them in
    for (const module of upstreamModules.values()) {
      const parentId = lookAhead(currentId, module);
      if (!parentId) {
        throw new Error('No provider available for upstream module');
      }
      if (parentId === '__ROOT__') {
        unresolved.add(module);
      } else {
        collectUnresolved(
          parentId as unknown as RegisterId,
          level + 1,
          initialModules,
          unresolved,
          seen
        );
      }
    }

    return unresolved;
  }

  function lookAhead(
    currentId: RegisterId,
    module: RuntimeContext<any>
  ): RegisterId | null {
    const parentId = treeMap.getParent(currentId);
    if (parentId === '__ROOT__') return parentId;

    const parentDeclarationId = componentInstanceApi.getDeclarationId(
      parentId!
    );
    // get runtime modules
    const modules = providerMap.getModulesById(parentDeclarationId!);
    if (modules.size === 0) return null;

    return modules.has(module)
      ? parentId
      : lookAhead(parentId as unknown as RegisterId, module);
  }

  // root entries are collected upstream entries that reached __ROOT__ by walking up the tree map.
  function extractProviders(
    ancestors: DryRunCandidateAncestor[],
    rootModules: Set<RuntimeContext<any>>
  ) {
    // for every entry, we want to validate separately, because every entry needs it's own traversal. however, we can use a set for root entries instead of an array, because IF withupstream reaches __ROOT__ we know for any duplicates that they will share the first ancestor that provides it.
    const modules = Array.from(rootModules.values());
    const traversals = modules.map((module) => {
      return resolveProvidersFromCandidate(ancestors, module);
    });

    // we merge the maps from different resolved start entries, by following the order of the ancestors, to build the map. We rely on insertion order later on to process.
    const merged = ancestors.reduce((map, { id }) => {
      const found = Array.from(traversals.values()).find((result) =>
        result.has(id)
      );
      return found ? map.set(id, found.get(id)!) : map;
    }, new Map<RegisterId, DryRunCandidateAncestor>());
    return merged;
  }

  function resolveProvidersFromCandidate(
    ancestors: DryRunCandidateAncestor[],
    module: RuntimeContext<any, any>
  ) {
    // obtain index of the candidate self in the ancestors array, as sometimes we start at the first descendent.
    const startIdx = Array.from(ancestors.values()).findIndex((a) =>
      a.localProviders.some((p) => p.type === 'runtime' && p.module === module)
    );

    const seen = new Set<RegisterId>();

    function traverse(index: number): Map<RegisterId, DryRunCandidateAncestor> {
      const ancestor = ancestors[index];

      if (seen.has(ancestor.id)) return new Map();
      seen.add(ancestor.id);

      const upstreamModules = ancestor.upstreamModules;
      if (upstreamModules.size === 0) return new Map();

      // Start with current level
      const currentLevel = new Map<RegisterId, DryRunCandidateAncestor>();

      currentLevel.set(ancestor.id, ancestor);

      // Merge in all upstream maps
      const combinedModules = new Set<RuntimeContext<any>>(
        ...upstreamModules.values()
      );
      for (const upstreamModule of combinedModules) {
        const upstreamIdx = lookAheadInAncestors(
          ancestors,
          index,
          upstreamModule
        );
        if (upstreamIdx === null)
          // TODO: add identifier to runtime module/context
          throw new Error(
            `No provider available for ${String(upstreamModule.key)}`
          );
        const upstreamMap = traverse(upstreamIdx);
        for (const [k, v] of upstreamMap) {
          if (!currentLevel.has(k)) {
            currentLevel.set(k, v);
          }
        }
      }
      return currentLevel;
    }

    const result = traverse(startIdx);
    return result;
  }

  // Helper to look upward in the ancestors array for a module
  function lookAheadInAncestors(
    ancestors: DryRunCandidateAncestor[],
    startIdx: number,
    module: RuntimeContext<any>
  ): number | null {
    for (let i = startIdx + 1; i < ancestors.length; i++) {
      // this returns the intantiated modules on the declId, but this is not working, as we cannot use declid anymore, in fact we need to bring this over from the ancestor data.

      // TODO: consider if we want to do this on the fly or that we store a set on the ancestor data. Seems to be better to put this on the ancestor data
      const modules = ancestors[i].localProviders.reduce(
        (p, entry) => (entry.type === 'runtime' ? p.add(entry.module) : p),
        new Set<RuntimeContext<any>>()
      );
      if (modules.has(module)) return i;
    }
    return null;
  }

  return {
    register: providerMap.register,
    resolveProviderData,
    getRoot,
    getRootAncestors,
  };
};

export const getProviderTree = (
  scopeId: ScopeId,
  treeMap: TreeMapStore,
  componentTree: ComponentInstanceApi
) => {
  return useProviderTree(scopeId, treeMap, componentTree);
};
