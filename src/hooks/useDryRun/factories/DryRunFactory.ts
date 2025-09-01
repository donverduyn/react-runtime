// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable eslint-comments/disable-enable-pair */

import * as React from 'react';
import { flushSync } from 'react-dom';
import ReactDOM from 'react-dom/client';
import { getComponentTree } from 'hooks/useComponentTree/useComponentTree';
import {
  getProviderTree,
  type ProviderTreeApi,
} from 'hooks/useProviderTree/useProviderTree';
import { getTreeMap } from 'hooks/useTreeMap/useTreeMap';
import type {
  DeclarationId,
  ProviderEntry,
  ResolvedProviderEntry,
  RuntimeModule,
  ScopeId,
} from '@/types';
import {
  createHiddenDomRoot,
  disableAsyncGlobals,
  type RootOpts,
} from 'utils/dom';
import { tryFnSync } from 'utils/function';
import type { EdgeDataFields } from 'utils/hash';
import { DryRunContext } from '../hooks/useDryRunContext';
import {
  getDryRunTracker,
  type DryRunTracker,
} from '../hooks/useDryRunTracker';
import type { DryRunCandidate } from './DryRunCandidate';
import { createDryRunContextObject } from './DryRunContextObject';

export type DryRunApi = {
  getResult(
    rootEntries: Set<ProviderEntry<any, any> & { type: 'upstream' }>
  ): readonly [
    Map<DeclarationId, ResolvedProviderEntry<any, any, unknown>[]>,
    DeclarationId[],
  ];
  promoteByRoot(self: EdgeDataFields): void;
};

export const createDryRunApi = (
  tracker: DryRunTracker,
  providerTree: ProviderTreeApi
): DryRunApi => {
  let root: EdgeDataFields | null = null;

  function getResult(
    rootEntries: Set<ProviderEntry<any, any> & { type: 'upstream' }>
  ) {
    // return a single result after validation
    // this is used by provider tree to continue the traversal.
    // We might need to inject the provider tree from the dry run scope into here, so we can pull the provider entries out that belong to the declaration ids from the candidate chains
    const candidates = tracker.getCandidates(root);
    const result = extractProviders(candidates, rootEntries);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (candidates[0] === undefined) {
      console.warn('No dry run candidates found', {
        root,
        rootEntries,
        candidates,
      });
      throw new Error('No dry run candidates found');
    }
    return [result, candidates[0].ancestors] as const;
  }

  // this is called during render of the portable root, to filter out candidates that do not match the current registerId and childrenSketch
  function promoteByRoot(self: EdgeDataFields) {
    root = self;
  }

  // root entries are collected upstream entries that reached __ROOT__ by walking up the tree map.
  function extractProviders(
    candidates: DryRunCandidate[],
    rootEntries: Set<ProviderEntry<any, any> & { type: 'upstream' }>
  ) {
    if (candidates.length === 0)
      return new Map<
        DeclarationId,
        ResolvedProviderEntry<any, any, unknown>[]
      >();

    // for every entry, we want to validate separately, because every entry needs it's own traversal. however, we can use a set for root entries instead of an array, because IF withupstream reaches __ROOT__ we know for any duplicates that they will share the first ancestor that provides it.
    const entries = Array.from(rootEntries.values());
    const results = entries.map((entry) => {
      return resolveProviders(candidates, entry);
    });

    const validated = results.every((result) => result !== null);
    if (!validated) {
      throw new Error('Inconsistent provider chains detected during dry run');
    }

    // we merge the maps from different resolved start entries
    const declIds = candidates[0].ancestors;
    const resultsArray = Array.from(results.values());
    const merged = declIds.reduce((map, declId) => {
      const found = resultsArray.find((result) => result.has(declId));
      if (found) {
        map.set(declId, found.get(declId)!);
      }
      return map;
    }, new Map<DeclarationId, ResolvedProviderEntry<any, any, unknown>[]>());
    return merged;
  }

  // Pass rootEntries to each resolver
  function resolveProviders(
    candidates: DryRunCandidate[],
    entry: ProviderEntry<any, any> & { type: 'upstream' }
  ) {
    const resolvedChains = candidates.map((candidate) =>
      resolveProvidersFromCandidate(candidate, entry)
    );

    const [first, ...rest] = resolvedChains;
    const validated = rest.every(
      (chain) =>
        chain.size === first.size &&
        Array.from(chain.entries()).every(
          ([id, entries]) =>
            first.has(id) &&
            first.get(id)!.length === entries.length &&
            first
              .get(id)!
              .every(
                (entry, entryIdx) =>
                  entries[entryIdx] && entry.id === entries[entryIdx].id
              )
        )
    );
    if (!validated) {
      console.warn('Off-tree candidates validation failed', {
        candidates,
        resolvedChains,
      });
    }

    return validated ? first : null;
  }

  function resolveProvidersFromCandidate(
    candidate: DryRunCandidate,
    entry: ProviderEntry<any, any> & { type: 'upstream' }
  ) {
    const declIds = candidate.ancestors;
    const startIdx = declIds.indexOf(
      findDeclIdForProviderEntry(declIds, entry) ?? candidate.self.declarationId
    );

    const seen = new Set<DeclarationId>();

    function traverse(
      index: number,
      level: number
    ): Map<DeclarationId, ResolvedProviderEntry<any, any, unknown>[]> {
      const declarationId = declIds[index];
      if (seen.has(declarationId)) return new Map();
      seen.add(declarationId);

      const entries = providerTree.getById(declarationId);
      if (!entries || entries.size === 0) return new Map();

      // Start with current level
      const currentLevel = new Map<
        DeclarationId,
        ResolvedProviderEntry<any, any, unknown>[]
      >();
      let count = 0;
      for (const entry of entries.values()) {
        currentLevel.set(
          declarationId,
          (currentLevel.get(declarationId) ?? []).concat(
            Object.assign({}, entry, {
              level,
              index: count,
            })
          )
        );
        count++;
      }

      // Merge in all upstream maps
      for (const entry of entries.values()) {
        if (entry.type === 'upstream') {
          const upstreamIdx = lookAheadInDeclArray(
            declIds,
            index,
            entry.module
          );
          if (upstreamIdx === null)
            throw new Error('No provider available for withUpstream');
          const upstreamMap = traverse(upstreamIdx, level + 1);
          for (const [k, v] of upstreamMap) {
            if (currentLevel.has(k)) {
              currentLevel.set(k, currentLevel.get(k)!.concat(v));
            } else {
              currentLevel.set(k, v);
            }
          }
        }
      }
      return currentLevel;
    }

    const result = traverse(startIdx, 0);
    return result;
  }

  function findDeclIdForProviderEntry(
    declIds: DeclarationId[],
    entry: ProviderEntry<any, any> & { type: 'upstream' }
  ): DeclarationId | null {
    for (const declId of declIds) {
      const modules = providerTree.getModulesById(declId);
      if (modules && modules.has(entry.module)) {
        return declId;
      }
    }
    return null;
  }

  // Helper to look upward in the declIds array for a module
  function lookAheadInDeclArray(
    declIds: DeclarationId[],
    startIdx: number,
    module: RuntimeModule<any, any>
  ): number | null {
    for (let i = startIdx + 1; i < declIds.length; i++) {
      const modules = providerTree.getModulesById(declIds[i]);
      if (!modules) continue;
      if (modules.has(module)) return i;
    }
    return null;
  }

  return {
    getResult,
    promoteByRoot,
  };
};

//
export function createReactDryRunRoot(opts: RootOpts) {
  const { container, destroy } = createHiddenDomRoot(opts);
  const root = ReactDOM.createRoot(container);
  return {
    render: root.render.bind(root),
    unmount() {
      try {
        root.unmount();
      } finally {
        destroy();
      }
    },
  };
}

export function createDryRunFactory<P extends object>(
  scopeId: ScopeId,
  Component: React.FC<P>,
  props: P,
  declarationId: DeclarationId
) {
  const contextObject = createDryRunContextObject(scopeId, declarationId);
  const root = createReactDryRunRoot({ mode: 'hidden' });
  // const reliability = computeEdgeReliability(edge);
  const restoreAsync = disableAsyncGlobals();

  // get results from dryRunTracker and return them
  // think about when we do the filtering, we might want to return a module from useDryRun so we can call one of the methods during render to filter using the registerId and childrenSketch, and then validate the provider traversal results against eachother. we also have to think where we do this validation. we can return a module from dryRunTracker that has a method to validate the results, since we also have to do this with late subtree mounts. we also need a place to store the results, or at least give access to the provider map, so the question is do we run this separate from the provider map, or do we merge once into the existing provider map. If we have to late reconstruct, i think it makes more sense to have let the provider map read drom dryRunTracker, this way we can let the dry run interact solely with the dry run tracker, and at render let everything interact with the tracker, but this feels still like it leaks

  const act =
    process.env.NODE_ENV === 'test' ? React.act : (fn: () => void) => fn();

  act(() => {
    flushSync(() => {
      root.render(
        React.createElement(
          DryRunContext.Provider,
          { value: contextObject },
          React.createElement(Component, props)
        )
      );
    });
    tryFnSync(() => {
      root.unmount();
      restoreAsync();
    });
  });

  const treeMap = getTreeMap(scopeId);
  const componentTree = getComponentTree(scopeId, treeMap);
  const providerTree = getProviderTree(scopeId, treeMap, componentTree);
  const tracker = getDryRunTracker(scopeId, componentTree);
  return createDryRunApi(tracker, providerTree);
}
