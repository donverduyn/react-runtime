import * as React from 'react';
import { v5 as uuidv5 } from 'uuid';

export const ID_PROP = '_id';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getStaticDeclarationId = <C extends React.FC<any>>(
  component: C & { [ID_PROP]?: string }
): string | undefined => component[ID_PROP];

// Namespaces for v5; keep them stable.
export const NS_SKETCH = '89e1b7f1-2a3f-4e6d-8f2d-5a3f0c1f1a77';

const REACT_MEMO = Symbol.for('react.memo');
const REACT_FORWARD_REF = Symbol.for('react.forward_ref');
const REACT_LAZY = Symbol.for('react.lazy');
const REACT_PROVIDER = Symbol.for('react.provider');
const REACT_CONTEXT = Symbol.for('react.context');
const REACT_PORTAL = Symbol.for('react.portal');

type SketchStats = {
  total: number;
  host: number;
  declComposite: number; // composite w/ declId
  anonComposite: number; // composite w/o declId (name/displayName fallback)
  portals: number;
  textish: number; // strings/numbers/booleans/etc.
  keyed: number; // elements that had an explicit key
};

export type SketchQuality = 'weak' | 'ok' | 'strong';

export type ChildrenSketch = {
  id: string; // final v5 UUID of the shape
  quality: SketchQuality;
  stats: SketchStats;
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers

function unwrapType(t: unknown) {
  let cur = t as { $$typeof?: symbol; type: unknown };
  for (let i = 0; i < 3; i++) {
    const tag = cur.$$typeof;
    if (tag === REACT_MEMO || tag === REACT_FORWARD_REF)
      cur = cur.type as { type: unknown };
    else break;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return cur as unknown as React.FC<any>;
}

function elementToken(el: React.ReactElement): {
  token: string;
  kind: 'host' | 'decl' | 'anon';
} {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
  const key = el.key != null ? String(el.key) : '';
  // host tag
  if (typeof el.type === 'string') {
    return { token: `host:${el.type}#${key}`, kind: 'host' };
  }

  // special react built-ins
  const t: unknown = el.type;
  const tag = (t as { $$typeof?: symbol }).$$typeof;
  if (tag === REACT_LAZY) return { token: `lazy#${key}`, kind: 'anon' };
  if (tag === REACT_PROVIDER) return { token: `provider#${key}`, kind: 'anon' };
  if (tag === REACT_CONTEXT) return { token: `context#${key}`, kind: 'anon' };

  const base = unwrapType(t);
  const decl = getStaticDeclarationId(base);
  if (decl) return { token: `decl:${decl}#${key}`, kind: 'decl' };

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const name = (base && (base.displayName || base.name)) || 'anon';
  return { token: `cmp:${name}#${key}`, kind: 'anon' };
}

function nonElementToken(node: React.ReactNode): string {
  if (
    node &&
    typeof node === 'object' &&
    (node as { $$typeof?: symbol }).$$typeof === REACT_PORTAL
  ) {
    return 'portal';
  }
  // Don’t hash text contents; keep it shape-only to avoid instability.
  const kind = typeof node; // 'string'|'number'|'boolean'|'object' (fragments handled elsewhere)
  return `nonel:${kind}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Folding

function foldNode(
  seed: string,
  node: React.ReactNode,
  depth: number,
  stats: SketchStats
): string {
  // Portal (not a valid element)
  if (
    node &&
    typeof node === 'object' &&
    (node as { $$typeof?: symbol }).$$typeof === REACT_PORTAL
  ) {
    stats.total++;
    stats.portals++;
    return uuidv5('portal', seed);
  }

  if (!React.isValidElement(node)) {
    stats.total++;
    stats.textish++;
    return uuidv5(nonElementToken(node), seed);
  }

  const el = node as React.ReactElement;

  // Fragment
  if (el.type === React.Fragment) {
    stats.total++;
    const acc = uuidv5('frag', seed);
    return depth > 0
      ? foldList(
          acc,
          (el.props as React.PropsWithChildren).children,
          depth - 1,
          stats
        )
      : acc;
  }

  // Host or composite
  const { token, kind } = elementToken(el);
  stats.total++;
  if (kind === 'host') stats.host++;
  else if (kind === 'decl') stats.declComposite++;
  else stats.anonComposite++;

  if (el.key != null) stats.keyed++;

  const acc = uuidv5(token, seed);

  // Only recurse through hosts/fragments, not composites
  if (kind === 'host' && depth > 0) {
    return foldList(
      acc,
      (el.props as React.PropsWithChildren).children,
      depth - 1,
      stats
    );
  }
  return acc;
}

function foldList(
  seed: string,
  list: React.ReactNode,
  depth: number,
  stats: SketchStats
): string {
  const arr = React.Children.toArray(list);
  // Seed with length so [], [A], [A,B] always differ
  let acc = uuidv5(`len:${String(arr.length)}`, seed);
  for (const c of arr) acc = foldNode(acc, c, depth, stats);
  return acc;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API

export function createChildrenSketch(
  children: React.ReactNode,
  maxDepth = 2,
  ns = NS_SKETCH
): ChildrenSketch {
  const stats: SketchStats = {
    total: 0,
    host: 0,
    declComposite: 0,
    anonComposite: 0,
    portals: 0,
    textish: 0,
    keyed: 0,
  };

  const id = foldList(ns, children, maxDepth, stats);

  // Heuristic quality: strong when we have multiple structural anchors
  // (hosts/decl’d composites/portals), OK for at least one, weak otherwise.
  const anchors = stats.host + stats.declComposite + stats.portals;
  const quality: SketchQuality =
    anchors >= 2 || (anchors >= 1 && stats.keyed > 0 && stats.total >= 2)
      ? 'strong'
      : anchors >= 1
        ? 'ok'
        : 'weak';

  return { id, quality, stats };
}
