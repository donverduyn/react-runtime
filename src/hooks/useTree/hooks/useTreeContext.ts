import * as React from 'react';
import type { ParentId } from 'types';
import type { TreeFrame } from '../factories/TreeFrame';
// the idea is to track by parent id, all the child ids per index. by doing this, we can assume that the index given the same referential equality of props, is enough to determine the id between remounts.

/**
 * React context for providing the current component id.
 * @type {React.Context<string | null>}
 */
export const TreeContext2 = React.createContext<ParentId | null>(null);

/**
 * Hook to get the parent id from the ComponentIdContext.
 * @returns {string | null} The parent component id.
 */
export function useTreeContext2() {
  return React.useContext(TreeContext2) ?? ('__ROOT__' as ParentId);
}

export const TreeContext = React.createContext<TreeFrame | null>(null);

export function useTreeContext() {
  return React.useContext(TreeContext);
}
