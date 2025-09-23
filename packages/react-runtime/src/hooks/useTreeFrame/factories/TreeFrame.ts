import type { ComponentId, RegisterId } from '@/types';
import { CUM_SIG_NS, type EdgeDataFields } from '@/utils/hash';

export type TreeFrameParentNode = Partial<{
  [K in keyof EdgeDataFields]: EdgeDataFields[K] | null;
}> & {
  registerId: RegisterId; // non-null, '__ROOT__' for root
  cumSig: string;
};

export type SeqEntry = {
  inUse: number;
  nextSalt: number;
  free: number[];
  claims: Map<symbol, number | null>;
};

export type TreeFrame = {
  parent: TreeFrameParentNode;
  seq: Map<ComponentId, SeqEntry>;
  depth: number;
  dryRunMeta?:
    | {
        parentHit: boolean;
      }
    | undefined;
};

export function createRootTreeFrame(): TreeFrame {
  return {
    depth: -1,
    parent: {
      declarationId: null,
      registerId: '__ROOT__' as RegisterId,
      childrenSketch: null,
      cumSig: CUM_SIG_NS,
    },
    seq: new Map<ComponentId, SeqEntry>(),
  };
}

export function createTreeFrame(
  parent: Omit<TreeFrame, 'seq'>,
  node: TreeFrameParentNode,
  dryRunMeta?: { parentHit: boolean }
): TreeFrame {
  return {
    parent: node,
    depth: parent.depth + 1,
    seq: new Map<ComponentId, SeqEntry>(),
    dryRunMeta,
  };
}
