// system/DryRunGate.ts

import type { ComponentId, ScopeId } from '@/types';
import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';

type Scope = {
  epoch: number;
  targetId: ComponentId;
  targetProps: Record<string, unknown>;
  parentId: ComponentId;
  parentProps: Record<string, unknown>;
  hit: boolean;
};

//* the point of this gate is to prune across the whole tree once hit is true instead of individually for each subtree after a match, so the pruning is only relevant if we are interested in the first match, for usage with withParentTag.

export class Gate {
  // TODO: consider using the same approach for other scoped singletons, like runtimeRegistry and providerMap, instead of relying on scopeId passed to singleton, to create different instances we manage it inside the implementation, so we can clean up, without needing an api from the singleton itself.

  private scopes = new Map<ScopeId, Scope>();
  constructor(private scopeId: ScopeId) {}

  /** Call this at the root, remove on unmount */
  begin(
    targetId: ComponentId,
    targetProps: Record<string, unknown> = {},
    parentId: ComponentId,
    parentProps: Record<string, unknown> = {}
  ): number {
    const prev = this.scopes.get(this.scopeId);
    const epoch = (prev?.epoch ?? 0) + 1;
    this.scopes.set(this.scopeId, {
      epoch,
      targetId,
      targetProps,
      parentId,
      parentProps,
      hit: false,
    });
    return epoch;
  }

  /**
   * match using (declId, ordinal, childrenSig) → v5 UUID.
   */
  mark(
    scopeId: ScopeId,
    targetId: ComponentId, // declId + props.id deterministic
    componentProps: Record<string, unknown>,
    parentId: ComponentId, // declId + props.id deterministic
    parentProps: Record<string, unknown>
  ): boolean {
    const scope = this.scopes.get(scopeId);
    if (
      scope &&
      scope.targetId === targetId &&
      scope.parentId === parentId &&
      scope.targetProps === componentProps &&
      scope.parentProps === parentProps &&
      !scope.hit
    ) {
      return true;
    } else {
      return false;
    }
  }

  /** After a hit, prune everything else in this scope. */
  shouldPrune(scopeId: ScopeId): boolean {
    return !!this.scopes.get(scopeId)?.hit;
  }

  /** Call on unmount */
  end(scopeId: ScopeId, epoch: number): void {
    const s = this.scopes.get(scopeId);
    if (s && s.epoch === epoch) this.scopes.delete(scopeId);
  }
}

export const useDryRunGate = createSingletonHook(
  (scopeId) => new Gate(scopeId)
);
