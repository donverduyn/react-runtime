import type { DeclarationId, ScopeId } from 'types';
import { createUseSalt } from './hooks/useSalt';
import { useTreeFrameContext } from './hooks/useTreeFrameContext';

export const useTreeFrame = <Mode extends 'live' | 'dry'>(
  scopeId: ScopeId,
  mode: Mode,
  targetId: DeclarationId | null = null
) => {
  const frame = useTreeFrameContext(scopeId, mode, targetId);
  return Object.assign(frame, {
    useSalt: createUseSalt(frame.seq),
  });
};
