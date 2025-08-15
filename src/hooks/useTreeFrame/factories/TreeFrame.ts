import type { ComponentId, DeclarationId, DeclId, ScopeId } from 'types';
import { ROOT_NS } from 'utils/hash';

type TreeFrameParentNode = {
  declarationId: DeclarationId | null;
  componentId: ComponentId | null;
  cumulativeSignature: string;
};

type TreeFrameBase = {
  scopeId: ScopeId;
  parent: TreeFrameParentNode;
  seq: Map<DeclId, number>;
};

export type DryRunTreeFrame = TreeFrameBase & {
  targetEdge: string;
  depth: number;
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
  seq: new Map<DeclId, number>(),
});

const createDryRunTreeFrame = (
  options: Omit<DryRunTreeFrame, 'mode' | 'seq'>
): DryRunTreeFrame => ({
  ...options,
  mode: 'dry',
  seq: new Map<DeclId, number>(),
});

export function createRootTreeFrame(scopeId: ScopeId): TreeFrame {
  return createLiveTreeFrame({
    scopeId,
    parent: {
      declarationId: null,
      componentId: null,
      cumulativeSignature: ROOT_NS,
    },
  });
}

export function nextOrdinal(frame: TreeFrame, childDecl: DeclId): number {
  const n = frame.seq.get(childDecl) ?? 0;
  frame.seq.set(childDecl, n + 1);
  return n;
}

export function createTreeFrame(
  parent: TreeFrame | DryRunTreeFrame,
  node: TreeFrameParentNode,
  hit: boolean = false
) {
  if (parent.mode === 'live') {
    return createLiveTreeFrame({
      scopeId: parent.scopeId,
      parent: node,
    });
  } else {
    return createDryRunTreeFrame({
      scopeId: parent.scopeId,
      parent: node,
      targetEdge: parent.targetEdge,
      depth: parent.depth + 1,
      parentHit: hit,
    });
  }
}
