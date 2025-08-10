// lineage.ts
import * as React from 'react';

type InstKey = string; // e.g. `${declId}:${hashHex}`
type DeclId = string;

export const ROOT_HASH = 0xcbf29ce484222325n; // FNV-1a 64-bit offset
const FNV_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;

export function fnv1a64Acc(seed: bigint, s: string): bigint {
  let h = seed;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * FNV_PRIME) & MASK64;
  }
  return h;
}

export const PathCtx = React.createContext<{ hash: bigint } | null>(null);

// Global maps (or your registry)
const instMap = new Map<InstKey, { decl: DeclId /*, instance…*/ }>();
export const getInstance = (key: InstKey) => instMap.get(key);
export const setInstance = (key: InstKey, decl: DeclId, value: unknown) => {
  instMap.set(key, { decl /*, instance: value*/ });
};
export const deleteInstance = (key: InstKey) => instMap.delete(key);
