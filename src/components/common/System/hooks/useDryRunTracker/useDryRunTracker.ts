// we want to collect a set of candidate hits.
// For each hit we want to obtain the candidate chain.
// then for every found candidate, we check if walking the providers resuls in the same declid order then the others. if not we return an error.

// candidate collection happens through the frame instance ids combined with the treeMap for the grandparent lookup and further, and the provider map to map each component id to its declaration id. think about dropping declid from the frame.

// when dry run returns the candidates with the chains, includes the candidate hit declid, instid and children sketch. this information is used in the live tree to filter the candidates, when a descendent component mounts.
// late subtree mounts can cause additional dependencies to be added, so in this case we resolve providers through all candidate chains and compare the results. if they deviate we show an error.

// don't forget we need to use a scope for all singleton maps, to isolate the dry runs from the live tree.

// also think about passing the live scopeId to the dry run, so the dry run knows which scope to use to store the candidate hits. let the dry run use its dryRunScopeId to create the other maps and dispose afterwards.

// also think about the reconstruction in the live tree. after accepting one of the resolved provider chains, use ghost instance ids for each level, and map the these ids to decl ids. Then think about merging with the current tree map or use a separate map and allow swithing over when hitting __ROOT__

// also think about building an cumSig using the tree frame. we use this frame to carry properties that we need for the dry run and which some of the methods from here should accept.

type CandidateHit = {
  declId: string;
  instId: string | null;
  childrenSketch: string;
  chain: string[];
  hasDescendent: boolean;
  depth: number;
};

export const useDryRunHit = () => {};
