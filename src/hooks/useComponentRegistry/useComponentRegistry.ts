import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';
import type { DeclarationId, ComponentMeta } from 'types';

type ComponentMap = Map<DeclarationId, ComponentMeta>;

const createComponentRegistry = () => {
  const map: ComponentMap = new Map();

  function getById(id: DeclarationId) {
    return map.get(id) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function register(id: DeclarationId, component: React.ComponentType<any>) {
    map.set(id, component);
  }

  function dispose(id: DeclarationId) {
    map.delete(id);
  }

  return {
    getById,
    register,
    dispose,
  };
};

const useComponentRegistryInstance = createSingletonHook(
  createComponentRegistry
);

export const useComponentRegistry = () => {
  const instance = useComponentRegistryInstance();
  return instance;
};

export const getComponentRegistry = () => {
  return useComponentRegistryInstance();
};
