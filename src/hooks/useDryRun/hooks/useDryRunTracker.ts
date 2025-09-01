// we want to collect a set of candidate hits.
// For each hit we want to obtain the candidate chain.
// then for every found candidate, we check if walking the providers resuls in the same declid order then the others. if not we return an error.

import type { ScopeId } from '@/types';
import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';
import type { ComponentTreeApi as ComponentTreeApi } from 'hooks/useComponentTree/useComponentTree';
import type { EdgeDataFields } from 'utils/hash';
import {
  createDryRunCandidate,
  DryRunCandidateId,
  type DryRunCandidate,
} from '../factories/DryRunCandidate';

// candidate collection happens through the frame instance ids combined with the treeMap for the grandparent lookup and further, and the provider map to map each component id to its declaration id. think about dropping declid from the frame.

// when dry run returns the candidates with the chains, includes the candidate hit declid, instid and children sketch. this information is used in the live tree to filter the candidates, when a descendent component mounts.
// late subtree mounts can cause additional dependencies to be added, so in this case we resolve providers through all candidate chains and compare the results. if they deviate we show an error.

// don't forget we need to use a scope for all singleton maps, to isolate the dry runs from the live tree.

// also think about passing the live scopeId to the dry run, so the dry run knows which scope to use to store the candidate hits. let the dry run use its dryRunScopeId to create the other maps and dispose afterwards.

// also think about the reconstruction in the live tree. after accepting one of the resolved provider chains, use ghost instance ids for each level, and map the these ids to decl ids. Then think about merging with the current tree map or use a separate map and allow swithing over when hitting __ROOT__

// also think about building an cumSig using the tree frame. we use this frame to carry properties that we need for the dry run and which some of the methods from here should accept.

export type DryRunTracker = {
  getCandidates(edge: EdgeDataFields | null): DryRunCandidate[];
  registerCandidate(
    self: EdgeDataFields,
    depth: number,
    firstDescendent: EdgeDataFields | null
  ): DryRunCandidate;
  unregisterCandidate(id: DryRunCandidateId): void;
};

const createDryRunTracker = (
  _: ScopeId,
  componentTree: ComponentTreeApi
): DryRunTracker => {
  const candidateMap = new Map<DryRunCandidateId, DryRunCandidate>();

  function getCandidates(self: EdgeDataFields | null) {
    const values = Array.from(candidateMap.values());
    return self
      ? values.filter(
          // TODO: we might be able to filter on firstDescendent too, but right now we only promote at the root. this would require us to promote again in the first descendent. the only question is, why should we, if we already have to validate between all sets at the root, then we know any subset is valid too, and it's unsafe to wait for the first descendent (if it exists), to decide since the dependencies at the root are already instantiated by that point. We might want to consider it though, to save a few checks on late subtree mounts for validation, since the candidate set would be substantially smaller, albeit it's not a very common case.
          (candidate) => candidate.self.componentId === self.componentId
        )
      : values;
  }

  function registerCandidate(
    self: EdgeDataFields,
    depth: number,
    firstDescendent: EdgeDataFields | null
  ) {
    const ancestors = componentTree.resolveAncestors(self.registerId);
    const candidate = createDryRunCandidate(
      self,
      firstDescendent,
      depth,
      ancestors
    );
    candidateMap.set(candidate.id, candidate);
    return candidate;
  }

  function unregisterCandidate(id: DryRunCandidateId) {
    candidateMap.delete(id);
  }
  return {
    getCandidates,
    registerCandidate,
    unregisterCandidate,
  };
};

const useDryRunTrackerInstance = createSingletonHook(createDryRunTracker);

export const useDryRunTracker = (
  scopeId: ScopeId,
  componentTree: ComponentTreeApi
) => {
  return useDryRunTrackerInstance(scopeId, componentTree);
};

// getter for external access
export const getDryRunTracker = useDryRunTracker;
