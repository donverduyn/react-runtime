import * as React from 'react';
import type { ScopeId } from 'types';

export const ScopeIdContext = React.createContext<ScopeId | null>(null);

export const useScopeIdContext = () => {
  const context = React.useContext(ScopeIdContext);
  return context;
};
