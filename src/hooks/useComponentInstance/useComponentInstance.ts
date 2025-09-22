// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  DeclarationId,
  ProviderId,
  RegisterId,
  RuntimeContext,
  RuntimeModule,
  ScopeId,
} from '@/types';
import { deepMergeMapsInPlace } from 'utils/map';

export type ComponentInstanceApi = {
  register: (
    id: RegisterId,
    declarationId: DeclarationId,
    upstreamModules: Map<ProviderId, Set<RuntimeContext<any>>>
  ) => void;
  dispose: (id: RegisterId) => void;
  getDeclarationId: (id: RegisterId) => DeclarationId | null;
  getUpstreamById: (
    id: RegisterId
  ) => Map<ProviderId, Set<RuntimeContext<any>>>;
};

export const useComponentInstance = (_: ScopeId): ComponentInstanceApi => {
  const idMap = new Map<RegisterId, DeclarationId>();
  const moduleMap = new Map<
    RegisterId,
    Map<ProviderId, Set<RuntimeContext<any>>>
  >();
  function getDeclarationId(id: RegisterId) {
    return idMap.get(id) || null;
  }

  function getUpstreamById(id: RegisterId) {
    const result = moduleMap.get(id);
    if (!result)
      moduleMap.set(id, new Map<ProviderId, Set<RuntimeContext<any>>>());
    return moduleMap.get(id)!;
  }

  function register(
    id: RegisterId,
    declarationId: DeclarationId,
    upstreamModules: Map<ProviderId, Set<RuntimeContext<any>>>
  ) {
    idMap.set(id, declarationId);
    const current = moduleMap.get(id);
    const newValue = current
      ? deepMergeMapsInPlace(current, upstreamModules)
      : upstreamModules;
    moduleMap.set(id, newValue);
  }

  function dispose(id: RegisterId) {
    idMap.delete(id);
    moduleMap.delete(id);
  }

  return {
    getUpstreamById,
    getDeclarationId,
    register,
    dispose,
  };
};

export const getComponentInstance = (scopeId: ScopeId) => {
  return useComponentInstance(scopeId);
};
