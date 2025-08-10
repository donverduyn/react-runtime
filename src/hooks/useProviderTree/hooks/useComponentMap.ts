import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';
import type { DeclarationId, ComponentId } from 'types';

const createComponentMap = () => {
  const idMap = new Map<ComponentId, DeclarationId>();

  function getDeclarationId(id: ComponentId | null) {
    return id ? (idMap.get(id) ?? null) : null;
  }

  function register(id: ComponentId, declarationId: DeclarationId) {
    idMap.set(id, declarationId);
  }

  function dispose(id: ComponentId) {
    idMap.delete(id);
  }

  return {
    getDeclarationId,
    register,
    dispose,
  };
};

const useComponentMapInstance = createSingletonHook(createComponentMap);

export const useComponentMap = () => {
  const instance = useComponentMapInstance();
  return instance;
};
