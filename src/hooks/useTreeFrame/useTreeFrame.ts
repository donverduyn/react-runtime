import type { ScopeId } from 'types';
import { useTreeFrameContext } from './hooks/useTreeFrameContext';

export const useTreeFrame = (scopeId: ScopeId) => {
  return useTreeFrameContext(scopeId);
};
