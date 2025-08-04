import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';
import type { ComponentId, ComponentMeta } from '../useRuntimeProvider/types';

type ComponentMap = Map<ComponentId, ComponentMeta>;

const createComponentRegistry = () => {
  const map: ComponentMap = new Map();

  function getById(id: ComponentId) {
    return map.get(id) ?? null;
  }

  function register(id: ComponentId, meta: ComponentMeta) {
    if (!map.has(id)) {
      map.set(id, meta);
    }
  }

  function dispose(id: ComponentId) {
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
