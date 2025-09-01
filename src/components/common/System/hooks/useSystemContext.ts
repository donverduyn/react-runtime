import * as React from 'react';
import type { ScopeId } from '@/types';

type SystemContext = {
  scopeId: ScopeId;
  mode: 'live' | 'dry';
  dryRunId: ScopeId | null;
};

export const SystemContext = React.createContext<SystemContext | null>(null);

export const useSystemContext = (
  scopeId: ScopeId,
  dryRunId: ScopeId | null,
  mode: 'live' | 'dry'
) => {
  return (
    React.useContext(SystemContext) ??
    createSystemContext(scopeId, dryRunId, mode)
  );
};

export const createSystemContext = (
  scopeId: ScopeId,
  dryRunId: ScopeId | null,
  mode: 'live' | 'dry'
): SystemContext => ({
  scopeId,
  dryRunId,
  mode,
});
