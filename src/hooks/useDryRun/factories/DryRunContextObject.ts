import type { ScopeId, DeclarationId } from '@/types';

export type DryRunContextObject = {
  scopeId: ScopeId;
  targetId: DeclarationId;
};

export const createDryRunContextObject = (
  scopeId: ScopeId,
  targetId: DeclarationId
): DryRunContextObject => {
  return {
    scopeId: scopeId,
    targetId: targetId,
  };
};
