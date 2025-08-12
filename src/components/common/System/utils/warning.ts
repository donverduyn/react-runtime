import type { ScopeId } from 'types';

const devSeenPerScope = new Map<ScopeId, Set<string>>();

export function devSeenKey(
  parentCumHash: number | 'root',
  declId: string,
  instId: string
) {
  return `${parentCumHash.toString()}::${declId}::${instId}`;
}

export function devSeenCheck(scopeId: ScopeId, key: string) {
  let set = devSeenPerScope.get(scopeId);
  if (!set) {
    set = new Set();
    devSeenPerScope.set(scopeId, set);
  }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

export function devSeenClear(scopeId: ScopeId) {
  devSeenPerScope.delete(scopeId);
}
