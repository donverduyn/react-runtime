// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable eslint-comments/disable-enable-pair */

import * as React from 'react';
import { flushSync } from 'react-dom';
import ReactDOM from 'react-dom/client';
import { getTreeMap } from '@/hooks/useTreeMap/useTreeMap';
import type {
  DeclarationId,
  RegisterId,
  RuntimeContext,
  ScopeId,
} from '@/types';
import {
  createHiddenDomRoot,
  disableAsyncGlobals,
  type RootOpts,
} from '@/utils/dom';
import { tryFnSync } from '@/utils/function';
import type { EdgeDataFields } from '@/utils/hash';
import type { PropService } from 'utils/effect';
import { DryRunContext } from '../hooks/useDryRunContext';
import {
  getDryRunTracker,
  type DryRunTracker,
} from '../hooks/useDryRunTracker';
import type {
  DryRunCandidate,
  DryRunCandidateAncestor,
} from './DryRunCandidate';
import { createDryRunContextObject } from './DryRunContextObject';

export type DryRunApi = {
  getOffTreeData(
    rootModules: Set<RuntimeContext<any, never, PropService>>
  ): readonly [
    Map<RegisterId, DryRunCandidateAncestor>,
    DryRunCandidate,
    boolean,
  ];
  promoteByRoot(self: EdgeDataFields): void;
  getRootAncestors(): DryRunCandidateAncestor[];
  getRoot(): DryRunCandidateAncestor;
};

export const createDryRunApi = (tracker: DryRunTracker): DryRunApi => {
  let rootEdge: EdgeDataFields | null = null;

  function getRootAncestors() {
    if (!rootEdge) throw new Error('No root set!');
    const [candidate] = tracker.getAuthorativeCandidate(rootEdge);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return candidate ? candidate.ancestors : [];
  }

  function getOffTreeData() {
    // return a single result after validation
    // this is used by provider tree to continue the traversal.
    // We might need to inject the provider tree from the dry run scope into here, so we can pull the provider entries out that belong to the declaration ids from the candidate chains
    if (!rootEdge) throw new Error('No root set!');
    const [candidate, isStructuralMatch] =
      tracker.getAuthorativeCandidate(rootEdge);
    // const result = extractProviders(candidate, rootModules);
    const result = candidate.ancestors.reduce(
      (map, ancestor) => map.set(ancestor.id, ancestor),
      new Map<RegisterId, DryRunCandidateAncestor>()
    );

    return [result, candidate, isStructuralMatch] as const;
  }

  // we should try to filter based on the props of the live root, when we call promoteByRoot. After that, we might be able to compare each candidate its ancestors, without risking ambiguity from a large candidate set.

  // If no props are provided and there is no direct match, we can show a warning in terms of automocking props using the canonical candidate

  // We can throw an error, if a missing props match results in ambiguous candidate ancestors among available candidates, specifically in terms of modules. The difference between comparing with results of resolving providers here is that we are more likely to hit ambiguity when we compare the ancestors directly. Instead we might want to go for a hybrid method, that only compares the modules based on the decl ids that were visited during traversal.

  // this is called during render of the portable root, to filter out candidates that do not match the current registerId and childrenSketch
  function promoteByRoot(self: EdgeDataFields) {
    rootEdge = self;
  }

  //* portable root or target
  function getRoot() {
    if (!rootEdge) throw new Error('No root set!');
    const [candidate, isStructuralMatch] =
      tracker.getAuthorativeCandidate(rootEdge);

    return candidate.ancestors.find(
      ({ id }) => id === candidate.self.registerId
    )!;
  }

  return {
    getRoot,
    getRootAncestors,
    getOffTreeData,
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
  const tracker = getDryRunTracker(scopeId, treeMap);
  return createDryRunApi(tracker);
}
