import type { ComponentId, DeclarationId, RegisterId, ScopeId } from 'types';
import { ROOT_NS, type EdgeDataFields } from 'utils/hash';

type TreeFrameParentNode = Partial<{
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

type TreeFrameBase = {
  scopeId: ScopeId;
  parent: TreeFrameParentNode;
  seq: Map<ComponentId, SeqEntry>;
  depth: number;
};

export type DryRunTreeFrame = TreeFrameBase & {
  targetId: DeclarationId | null;
  parentHit: boolean;
  mode: 'dry';
};

export type TreeFrame = TreeFrameBase & {
  mode: 'live';
};

const createLiveTreeFrame = (
  options: Omit<TreeFrame, 'mode' | 'seq'>
): TreeFrame => ({
  ...options,
  mode: 'live',
  seq: new Map<ComponentId, SeqEntry>(),
});

const createDryRunTreeFrame = (
  options: Omit<DryRunTreeFrame, 'mode' | 'seq'>
): DryRunTreeFrame => ({
  ...options,
  mode: 'dry',
  seq: new Map<ComponentId, SeqEntry>(),
});

export function createRootTreeFrame<Mode extends 'live' | 'dry'>(
  scopeId: ScopeId,
  mode: Mode = 'live' as Mode,
  targetId: DeclarationId | null = null
): TreeFrame | DryRunTreeFrame {
  return mode === 'live'
    ? createLiveTreeFrame({
        scopeId,
        parent: {
          declarationId: null,
          registerId: '__ROOT__' as RegisterId,
          childrenSketch: null,
          cumSig: ROOT_NS,
        },
        depth: 0,
      })
    : createDryRunTreeFrame({
        scopeId,
        parent: {
          declarationId: null,
          registerId: '__ROOT__' as RegisterId,
          childrenSketch: null,
          cumSig: ROOT_NS,
        },
        targetId: targetId,
        depth: 0,
        parentHit: false,
      });
}

export function createTreeFrame(
  parent: Omit<TreeFrame, 'seq'> | Omit<DryRunTreeFrame, 'seq'>,
  node: TreeFrameParentNode,
  hit: boolean = false
) {
  if (parent.mode === 'live') {
    return createLiveTreeFrame({
      scopeId: parent.scopeId,
      parent: node,
      depth: parent.depth + 1,
    });
  } else {
    return createDryRunTreeFrame({
      scopeId: parent.scopeId,
      parent: node,
      targetId: parent.targetId,
      depth: parent.depth + 1,
      parentHit: hit,
    });
  }
}
