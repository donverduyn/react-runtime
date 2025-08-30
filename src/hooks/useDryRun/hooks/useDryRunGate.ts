// system/DryRunGate.ts

import type { ScopeId } from 'types';
import {
  computeFallbackSig,
  FALLBACK_NS,
  type ChildrenSig,
  type EdgeSig,
  type FallbackSig,
} from 'utils/hash';

type Scope = {
  epoch: number;
  target: EdgeSig; // your primary (number/bigint/etc.)
  hit: boolean;
  fallbackTarget?: FallbackSig;
};

export class Gate {
  private scopes = new Map<ScopeId, Scope>();
  private ns: string = FALLBACK_NS;

  /** Optional: override namespace used for v5 fallback signatures. */
  setNamespace(ns: string) {
    this.ns = ns;
  }

  /** Start a dry-run epoch. Optionally attach a precomputed fallback UUID. */
  begin(
    scopeId: ScopeId,
    target: EdgeSig,
    opts?: { fallback?: FallbackSig }
  ): number {
    const prev = this.scopes.get(scopeId);
    const epoch = (prev?.epoch ?? 0) + 1;
    this.scopes.set(scopeId, {
      epoch,
      target,
      hit: false,
      fallbackTarget: opts?.fallback ?? '',
    });
    return epoch;
  }

  /** Attach/replace a fallback UUID later (e.g. once childrenSig is known). */
  setFallback(scopeId: ScopeId, fallback: FallbackSig): void {
    const s = this.scopes.get(scopeId);
    if (s) s.fallbackTarget = fallback;
  }

  /** Primary match (exact edge). */
  mark(scopeId: ScopeId, edge: EdgeSig): boolean {
    const s = this.scopes.get(scopeId);
    if (!s || s.hit) return false;
    if (edge === s.target) {
      s.hit = true;
      return true;
    }
    return false;
  }

  /**
   * Fallback match using (declId, ordinal, childrenSig) → v5 UUID.
   * Use this when you lack a stable instance id but can fingerprint context.
   */
  markFallback(
    scopeId: ScopeId,
    declId: string,
    ordinal: number,
    childrenSig: ChildrenSig
  ): boolean {
    const s = this.scopes.get(scopeId);
    if (!s || s.hit || s.fallbackTarget === undefined) return false;
    const cand = computeFallbackSig(declId, ordinal, childrenSig, this.ns);
    if (cand === s.fallbackTarget) {
      s.hit = true;
      return true;
    }
    return false;
  }

  /** After a hit, prune everything else in this scope. */
  shouldPrune(scopeId: ScopeId): boolean {
    return !!this.scopes.get(scopeId)?.hit;
  }

  /** End the epoch (ignored if a newer epoch is active). */
  end(scopeId: ScopeId, epoch: number): void {
    const s = this.scopes.get(scopeId);
    if (s && s.epoch === epoch) this.scopes.delete(scopeId);
  }
}

export const dryRunGate = new Gate();
