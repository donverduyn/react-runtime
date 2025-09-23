import { createSingletonHook } from '@/hooks/common/factories/SingletonFactory';
import type { ScopeId } from '@/types';
import { createDryRunFactory } from './factories/DryRunFactory';

export { type DryRunApi } from './factories/DryRunFactory';
export { useDryRunTracker } from './hooks/useDryRunTracker';
export { useDryRunContext } from './hooks/useDryRunContext';

// technically it's a hook, but it cannot be used inside react, because it calls root.render, but we reuse createSingletonHook to obtain the api instance in the live tree. in other files we inverse it
export const useDryRunInstance = createSingletonHook(createDryRunFactory);

export const useDryRun = () => {
  return {
    getInstance: (scopeId: ScopeId) => {
      // TODO: think about using an alternative to createSingletonHook, because we need access to the instance in non-react code too and the api is a bit misleading.
      const instance = useDryRunInstance(scopeId);

      if (!scopeId) {
        console.warn('useDryRun called with null scopeId', instance);
      }
      return instance;
    },
  };
};

// this is called outside of react
export const createDryRun = useDryRunInstance;
