import type { DeclarationId, RegisterId, ScopeId } from '@/types';
import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';

const createComponentMap = () => {
  const idMap = new Map<RegisterId, DeclarationId>();
  const reverseMap = new Map<DeclarationId, Set<RegisterId>>();

  function getDeclarationId(id: RegisterId | null) {
    return id ? (idMap.get(id) ?? null) : null;
  }

  function getInstanceIds(declarationId: DeclarationId) {
    return Array.from(reverseMap.get(declarationId) ?? []);
  }

  function register(id: RegisterId, declarationId: DeclarationId) {
    idMap.set(id, declarationId);
    reverseMap.set(
      declarationId,
      (reverseMap.get(declarationId) ?? new Set()).add(id)
    );
  }

  function dispose(id: RegisterId) {
    idMap.delete(id);
    reverseMap.forEach((ids, declarationId) => {
      if (ids.has(id)) {
        ids.delete(id);
        if (ids.size === 0) {
          reverseMap.delete(declarationId);
        }
      }
    });
  }

  return {
    getDeclarationId,
    getInstanceIds,
    register,
    dispose,
  };
};

const useComponentMapInstance = createSingletonHook(createComponentMap);

export const useComponentMap = (scopeId: ScopeId) => {
  const instance = useComponentMapInstance(scopeId);
  return instance;
};
