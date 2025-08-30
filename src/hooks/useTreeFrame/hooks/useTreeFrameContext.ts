import * as React from 'react';
import type { DeclarationId, ScopeId } from 'types';
import {
  createRootTreeFrame,
  type DryRunTreeFrame,
  type TreeFrame,
} from '../factories/TreeFrame';

export const TreeFrameContext = React.createContext<
  TreeFrame | DryRunTreeFrame | null
>(null);

export function useTreeFrameContext<Mode extends 'live' | 'dry'>(
  scopeId: ScopeId,
  mode: Mode = 'live' as Mode,
  targetId: DeclarationId | null = null
) {
  return (
    React.useContext(TreeFrameContext) ??
    createRootTreeFrame(scopeId, mode, targetId)
  );
}
