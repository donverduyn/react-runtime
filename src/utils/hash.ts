/* eslint-disable eslint-comments/disable-enable-pair */

import { v5 as uuidv5, v4 as uuidv4 } from 'uuid';
import type { ComponentId, DeclarationId, RegisterId } from '@/types';
import type { ChildrenSketch } from './react/children';

// unique per library instance
export const ROOT_NS = uuidv4();

// one library-wide namespace (stable constant)
export const LIB_NS = uuidv5(`react-runtime@idns:${ROOT_NS}`, uuidv5.DNS);

// isolated base for cumulative sigs
export const CUM_SIG_NS = uuidv5('CUM_SIG_ID', LIB_NS);

export function createGhostId(regId: RegisterId) {
  return uuidv5(`ghost:${regId}`, LIB_NS);
}

export function createIdFactory(declId: string) {
  const DECL_NS = uuidv5(declId, LIB_NS);

  function baseId(instId: string) {
    const id = uuidv5(instId, DECL_NS);
    return id;
  }

  function withTrail(cumSig: string, instId: string, salt: number | null) {
    if (salt === null) return uuidv5(`${cumSig}|${declId}#${instId}`, DECL_NS);
    return uuidv5(`${cumSig}|${declId}#${instId}@${String(salt)}`, DECL_NS);
  }

  function createId(instId: string, salt: number | null) {
    const base = baseId(instId);
    return withTrail(base, instId, salt);
  }

  return Object.assign(createId, { baseId, withTrail });
}

// cumulative (namespace-chain): parent cum UUID -> child UUID
export function combineV5(
  parentCum: string,
  decl: string,
  inst: string
): string {
  const msg = `${decl}#${inst}`;
  return uuidv5(msg, parentCum); // parentCum acts as namespace
}

export type EdgeDataFields = {
  props: Record<string, unknown>;
  declarationId: DeclarationId;
  componentId: ComponentId;
  registerId: RegisterId;
  childrenSketch: ChildrenSketch;
};
