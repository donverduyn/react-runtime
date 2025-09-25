import moize from 'moize';
import { createSingletonHook } from '@/hooks/common/factories/SingletonFactory';
import type { TreeMapStore } from '@/hooks/useTreeMap/useTreeMap';
import type { RegisterId, ScopeId } from '@/types';
import { type EdgeDataFields } from '@/utils/hash';
import {
  createDryRunCandidateDto,
  DryRunCandidateId,
  type DryRunCandidate,
  type DryRunCandidateAncestor,
  type DryRunCandidateDto,
} from '../factories/DryRunCandidate';

export type DryRunTracker = {
  getAuthorativeCandidate(
    edge: EdgeDataFields
  ): readonly [DryRunCandidate, boolean];
  registerAncestor(ancestor: DryRunCandidateAncestor): void;
  registerCandidate(
    self: EdgeDataFields,
    depth: number,
    firstDescendent: EdgeDataFields | null
  ): void;
  unregisterCandidate(id: DryRunCandidateId): void;
};

const validateCandidates = moize(
  (candidates: DryRunCandidate[]) => {
    if (candidates.length > 1) {
      console.warn(
        `\x1b[38;5;208m[Warning]\x1b[0m Multiple dry run candidates found. Automatically picking one with props: ${
          candidates[0]
            ? `\x1b[36m${JSON.stringify(candidates[0].self.props)}\x1b[0m`
            : ''
        }. \x1b[2mPlease ensure that the provided id prop matches with one of the component instances in the tree, or that the component is not rendered multiple times in the same scope with the same id or props.\x1b[0m`
      );
    }
    if (candidates.length === 0) {
      console.info(
        `\x1b[38;5;39m[Notice]\x1b[0m \x1b[2mNo structural matches found. Resolving as a direct descendent of the provider scope root. To silence this message, use:\x1b[0m withProviderScope(Root, { structural: false })`
      );
    }
  },
  // TODO: think about how we want trigger logs only once. It seems that because we use singleton hooks with multiple scopes in multiple places, we get logs multiple times.
  { isDeepEqual: true }
);

const createDryRunTracker = (
  _: ScopeId,
  treeMap: TreeMapStore
): DryRunTracker => {
  const candidateMap = new Map<DryRunCandidateId, DryRunCandidateDto>();
  // even though we could store everything in component instance api, and pull from there, we don't want to track everything by default in the live tree, since we write at every render.
  const ancestorMap = new Map<RegisterId, DryRunCandidateAncestor>();

  //* since dry run will only ever run before react runs, the results from this function are always deterministic and can be cached. Also this function always gets called with the same argument, so this doesn't lead to extra memory consumption. Note that we also prevent validation from running again which makes sense to do, as duplicate logs don't.

  const getAuthorativeCandidate = moize((self: EdgeDataFields) => {
    // we reference ancestorIds from candidateMap to avoid duplication of data.
    const values = Array.from(candidateMap.values()).map<DryRunCandidate>(
      (dto) =>
        Object.assign({}, dto, {
          ancestors: dto.ancestors.map((id) => ancestorMap.get(id)!),
        })
    );
    let result: DryRunCandidate[] = [];
    let isStructuralMatch = true;
    if (!self.props.id) {
      // pick the first candidate, and collect all candidates with the same id prop
      const authorative = values[0];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      result = (authorative ? [authorative] : []).concat(
        values.filter(
          (candidate) =>
            candidate.self.props.id === authorative.self.props.id &&
            candidate !== authorative
        )
      );
    } else {
      result = values.filter((candidate) =>
        candidate.self.componentId === self.componentId && self.props.id
          ? candidate.self.props.id === self.props.id
          : true
      );
    }
    // show warning if result > 1
    validateCandidates(result);

    if (result.length === 0) {
      // TODO: last item in ancestor map is always the root, but we might want to use a better way to target it directly from the map.
      const rootAncestor = Array.from(ancestorMap.values())[
        ancestorMap.size - 1
      ];
      // go for a fallback candidate and use the root as the single ancestor
      // const candidateId = uuid();
      const targetAncestor: DryRunCandidateAncestor = {
        declId: self.declarationId,
        id: self.registerId,
        props: self.props,
        upstreamModules: new Map(),
        localProviders: [],
      };
      const candidate = {
        id: self.registerId as unknown as DryRunCandidateId,
        depth: 1,
        self: self,
        firstDescendent: null,
        ancestors: [targetAncestor, rootAncestor],
      };

      result.push(candidate);
      isStructuralMatch = false;
    }

    return [result[0], isStructuralMatch] as const;
  });

  function registerAncestor(ancestor: DryRunCandidateAncestor) {
    if (!ancestorMap.has(ancestor.id)) {
      ancestorMap.set(ancestor.id, ancestor);
    }
  }

  function registerCandidate(
    self: EdgeDataFields,
    depth: number,
    firstDescendent: EdgeDataFields | null
  ) {
    // TODO: consider what is the right place to obtain the ancestors, or rename resolveAncestors to resolveAncestorIds.
    const ancestorIds = resolveAncestorIds(self.registerId);
    const candidate = createDryRunCandidateDto(
      self,
      firstDescendent,
      depth,
      ancestorIds
    );
    candidateMap.set(candidate.id, candidate);
    // return candidate;
  }

  // this is used by DryRunTracker to create candidates
  function resolveAncestorIds(id: RegisterId) {
    const ancestors: RegisterId[] = [];
    let currentId: RegisterId | null = id;
    while (currentId && currentId !== '__ROOT__') {
      ancestors.push(currentId);
      currentId = treeMap.getParent(currentId);
    }
    return ancestors;
  }

  function unregisterCandidate(id: DryRunCandidateId) {
    candidateMap.delete(id);
  }
  return {
    getAuthorativeCandidate,
    registerAncestor,
    registerCandidate,
    unregisterCandidate,
  };
};

const useDryRunTrackerInstance = createSingletonHook(createDryRunTracker);

export const useDryRunTracker = (scopeId: ScopeId, treeMap: TreeMapStore) => {
  return useDryRunTrackerInstance(scopeId, treeMap);
};

// getter for external access
export const getDryRunTracker = useDryRunTracker;
