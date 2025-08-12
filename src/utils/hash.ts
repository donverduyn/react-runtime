/* eslint-disable eslint-comments/disable-enable-pair */

import { v5 as uuidv5 } from 'uuid';

export const ROOT_NS = '6e0d58b0-6a8e-4a53-8a30-0d9b8b1a8f37'; // pick & freeze once
// one library-wide namespace (stable constant)
export const LIB_NS = uuidv5('react-runtime@idns', uuidv5.DNS);
// Namespaces for v5 hashes (any fixed UUIDs)
export const NS_SKETCH = '7e0b3a4b-1f2b-4c4d-9a6d-2c2b1a5e8e01';
export const NS_EDGE = 'b4f7f6c1-0cfd-4f07-9b4a-3f6cf7c9a2ec';
// You can swap this for your own fixed namespace if you want isolation.
export const FALLBACK_NS = '3b7c7c9c-9f8f-4e1d-8f6e-6a2b5d9b4b11';

export type EdgeSig = string;
export type FallbackSig = string;
export type ChildrenSig = string;

/** Create a per-declaration id factory. */
export function createIdFactory(declId: string) {
  const DECL_NS = uuidv5(declId, LIB_NS); // stable per declaration
  return (parentCumHash: string, ordinal: number) =>
    uuidv5(`${parentCumHash}|${declId}@${ordinal.toString()}`, DECL_NS);
}
/** Immediate parent tuple → namespace UUID (prefix-agnostic) */
export const parentNS = (parentDecl?: string, parentInst?: string) =>
  uuidv5(`${parentDecl ?? ''}#${parentInst ?? ''}`, ROOT_NS);

// cumulative (namespace-chain): parent cum UUID -> child UUID
export function combineV5(
  parentCum: string,
  decl: string,
  inst: string,
  ordinal: number
): string {
  const msg = `${decl}#${inst}@${ordinal.toString()}`;
  return uuidv5(msg, parentCum); // parentCum acts as namespace
}

/** Per parent, count children of a given decl to get a stable ordinal. */
export function nextOrdinal(
  seq: Map<string, number>,
  childDeclId: string
): number {
  const n = seq.get(childDeclId) ?? 0;
  seq.set(childDeclId, n + 1);
  return n;
}

export type EdgeInputs = {
  parentDeclId?: string;
  parentInstId?: string;
  parentChildrenSketch?: string;
  declId: string;
  instId?: string;
  childrenSketch?: string;
  ordinal: number;
};

/** Canonical, order-sensitive edge hash (deterministic, minification-safe). */
export function edgeSigV5(i: EdgeInputs): string {
  const msg =
    `p:${i.parentDeclId ?? ''}#${i.parentInstId ?? ''}|` +
    `ps:${i.parentChildrenSketch ?? ''}||` +
    `c:${i.declId}#${i.instId ?? ''}|` +
    `cs:${i.childrenSketch ?? ''}|@${i.ordinal.toString()}`;
  return uuidv5(msg, NS_EDGE);
}

/** Deterministic v5 UUID from decl + ordinal + children sketch. */
export function computeFallbackSig(
  declId: string,
  ordinal: number,
  childrenSig: ChildrenSig,
  ns: string = FALLBACK_NS
): FallbackSig {
  // shape: `${decl}@${ordinal}|${childrenHex}`
  return uuidv5(`${declId}@${ordinal.toString()}|${childrenSig}`, ns);
}

type ReliabilityTier = 'ambiguous' | 'weak' | 'good' | 'strong';
type SketchQuality = 'weak' | 'ok' | 'strong';

export type EdgeData = {
  declId: string;
  instId?: string;
  childSketchQuality: SketchQuality;
};

function looksUuidV4(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}
function looksUuidV5(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

// very rough entropy sniffing: length + distinct chars
function approxEntropyBits(s: string) {
  const set = new Set(s);
  const classes =
    (/[a-z]/.test(s) ? 1 : 0) +
    (/[A-Z]/.test(s) ? 1 : 0) +
    (/[0-9]/.test(s) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(s) ? 1 : 0);
  return Math.min(
    128,
    (Math.log2(Math.max(2, set.size)) + 1.5 * classes) * Math.sqrt(s.length)
  );
}

function instIdScore(instId?: string): { score: number; reason: string } {
  if (!instId) return { score: 0, reason: 'no instId' };
  if (looksUuidV5(instId)) {
    return { score: 0.18, reason: 'auto v5 (deterministic)' };
  }
  if (looksUuidV4(instId)) {
    return { score: 0.08, reason: 'uuid v4 (ephemeral)' };
  }
  const ent = approxEntropyBits(instId);
  if (ent >= 40) return { score: 0.25, reason: 'user instId high entropy' };
  if (ent >= 20) return { score: 0.15, reason: 'user instId medium entropy' };
  return { score: 0.08, reason: 'user instId low entropy' };
}

function sketchScore(q: SketchQuality): { score: number; reason: string } {
  if (q === 'strong') return { score: 0.25, reason: 'childSketch strong' };
  if (q === 'ok') return { score: 0.15, reason: 'childSketch ok' };
  return { score: 0.05, reason: 'childSketch weak' };
}

export function computeEdgeReliability(ev: EdgeData) {
  let score = 0;
  const reasons: string[] = [];

  reasons.push('declId present');
  {
    const s = instIdScore(ev.instId);
    score += s.score;
    reasons.push(s.reason);
  }
  {
    const s = sketchScore(ev.childSketchQuality);
    score += s.score;
    reasons.push(s.reason);
  }
  score = Math.max(0, Math.min(1, score));

  const tier: ReliabilityTier =
    score >= 0.75
      ? 'strong'
      : score >= 0.5
        ? 'good'
        : score >= 0.3
          ? 'weak'
          : 'ambiguous';

  return { score, tier, reasons };
}
