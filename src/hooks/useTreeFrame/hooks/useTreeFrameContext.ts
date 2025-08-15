import * as React from 'react';
import type { ScopeId } from 'types';
import {
  createRootTreeFrame,
  type DryRunTreeFrame,
  type TreeFrame,
} from '../factories/TreeFrame';

export const TreeFrameContext = React.createContext<
  TreeFrame | DryRunTreeFrame | null
>(null);

export function useTreeFrameContext(scopeId: ScopeId) {
  return React.useContext(TreeFrameContext) ?? createRootTreeFrame(scopeId);
}
