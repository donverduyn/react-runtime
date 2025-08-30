/* eslint-disable eslint-comments/disable-enable-pair */

import { v5 as uuidv5, v4 as uuidv4 } from 'uuid';
import type { ComponentId, DeclarationId, RegisterId } from 'types';
import type { ChildrenSketch } from './react/children';

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
// export function createIdFactory(declId: string) {
//   const DECL_NS = uuidv5(declId, LIB_NS); // stable per declaration
//   return (cumSig: string, instId: string, salt: number | null) => {
//     const suffix = salt !== null ? `@${String(salt)}` : '';
//     return uuidv5(`${cumSig}|${declId}#${instId}${suffix}`, DECL_NS);
//   };
// }

export function createGhostRegisterId(): RegisterId {
  return `ghost:${uuidv4()}` as RegisterId;
}

export function createIdFactory(declId: string) {
  const DECL_NS = uuidv5(declId, LIB_NS); // stable per declaration

  // Step 1: Create the base id (without suffix)
  function baseId(instId: string) {
    const id = uuidv5(instId, DECL_NS);
    console.log('creating component id with', declId, instId, DECL_NS, id);
    return id;
  }

  // Step 2: Add a suffix to an existing id (for ordinal/salt)
  function withTrail(cumSig: string, instId: string, salt: number | null) {
    if (salt === null) return uuidv5(`${cumSig}|${declId}#${instId}`, DECL_NS);
    return uuidv5(`${cumSig}|${declId}#${instId}@${String(salt)}`, DECL_NS);
  }

  // Combined: for backward compatibility
  function createId(instId: string, salt: number | null) {
    const base = baseId(instId);
    return withTrail(base, instId, salt);
  }

  // Expose all three for flexibility
  return Object.assign(createId, { baseId, withTrail });
}

/** Immediate parent tuple → namespace UUID (prefix-agnostic) */
export const parentNS = (parentDecl?: string, parentInst?: string) =>
  uuidv5(`${parentDecl ?? ''}#${parentInst ?? ''}`, ROOT_NS);

// cumulative (namespace-chain): parent cum UUID -> child UUID
export function combineV5(
  parentCum: string,
  decl: string,
  inst: string
): string {
  const msg = `${decl}#${inst}`;
  return uuidv5(msg, parentCum); // parentCum acts as namespace
}

export type EdgeInputs = {
  parent?: EdgeDataFields;
  self: Partial<EdgeDataFields> & Pick<EdgeDataFields, 'declarationId'>;
  salt?: number;
};

/** Canonical, order-sensitive edge hash (deterministic, minification-safe). */
export function edgeSigV5(i: EdgeInputs): string {
  const msg =
    `p:${i.parent?.declarationId ?? ''}#${i.parent?.componentId ?? ''}|` +
    `ps:${i.parent?.childrenSketch.id ?? ''}||` +
    `c:${i.self.declarationId}#${i.self.componentId ?? ''}|` +
    `cs:${i.self.childrenSketch?.id ?? ''}|${i.salt ? `@${String(i.salt)}` : ''}`;
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

export type EdgeDataFields = {
  declarationId: DeclarationId;
  componentId: ComponentId;
  registerId: RegisterId;
  childrenSketch: ChildrenSketch;
};

export type EdgeData = {
  self: EdgeDataFields;
  firstDescendent?: EdgeDataFields;
};
