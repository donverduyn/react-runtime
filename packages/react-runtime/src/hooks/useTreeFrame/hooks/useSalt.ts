import * as React from 'react';
import type { ComponentId } from '@/types';
import type { SeqEntry } from '../factories/TreeFrame';

function ensure(map: Map<ComponentId, SeqEntry>, ComponentId: ComponentId) {
  let f = map.get(ComponentId);
  if (!f) {
    f = { inUse: 0, nextSalt: 1, free: [], claims: new Map() };
    map.set(ComponentId, f);
  }
  return f;
}

/**
 * useSalt
 * - Synchronous: returns a stable salt for this mount right in render.
 * - Unique among siblings in the same wrapped-parent "family".
 * - First sibling gets unsalted (null) → rehydratable key; others get salted.
 * - StrictMode-safe: the same token is reused across the double render, so we don't double-claim.
 *
 * @param map TreeFrame.seq (Map<ComponentId, Family>) shared by all direct descendants of the wrapped parent
 * @param ComponentId   Deterministic family id (e.g. hash(cumSig, declId[, instId or userId]))
 * @param dbg      Optional dev hints for warnings
 */
export function createUseSalt(map: Map<ComponentId, SeqEntry>) {
  return (
    ComponentId: ComponentId,
    dbg?: { userId?: string; familyLabel?: string }
  ) => {
    const token = React.useMemo(() => Symbol('salt'), []);
    const family = ensure(map, ComponentId);

    let claim = family.claims.get(token);
    if (claim === undefined) {
      const taken = family.inUse + family.claims.size;
      claim = taken === 0 ? null : (family.free.pop() ?? family.nextSalt++);
      family.claims.set(token, claim);
    }

    React.useLayoutEffect(() => {
      const f = ensure(map, ComponentId);
      const c = f.claims.get(token);

      if (c !== undefined) {
        f.claims.delete(token);
        f.inUse++;
      }

      return () => {
        const g = map.get(ComponentId);
        if (!g) return;
        g.inUse = Math.max(0, g.inUse - 1);
        if (c !== null && c !== undefined) g.free.push(c);
        if (g.inUse === 0 && g.claims.size === 0) map.delete(ComponentId);
      };
    }, [map, ComponentId, token]);

    if (process.env.NODE_ENV !== 'production' && dbg?.userId) {
      const col = family.inUse + family.claims.size > 1 && claim !== null;
      if (col) {
        const where = dbg.familyLabel ? ` for ${dbg.familyLabel}` : '';

        console.warn(
          `[react-runtime] duplicate id "${dbg.userId}" under the same wrapped parent${where} — using salted (ephemeral) key`
        );
      }
    }

    return claim;
  };
}
