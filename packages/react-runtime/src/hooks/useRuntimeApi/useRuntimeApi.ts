import { Layer, ManagedRuntime } from 'effect';
import { createSingletonHook } from '@/hooks/common/factories/SingletonFactory';
import type {
  RuntimeContext,
  RuntimeInstance,
  RuntimeKey,
  ScopeId,
} from '@/types';
import type { PropService } from 'utils/effect';
import { createUse } from './hooks/use';
import { createFn } from './hooks/useFn';
import { createPush } from './hooks/usePush';
import { createRun } from './hooks/useRun';

const createRuntimeApi = () => {
  function create<R>(
    module: RuntimeContext<R, never, PropService>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeKey, RuntimeInstance<any>>
  ) {
    return {
      instance: instances.get(module.key)!.runtime,
      use: createUse(module, instances),
      useFn: createFn(module, instances),
      usePush: createPush(module, instances),
      useRun: createRun(module, instances),
    };
  }

  function createInert<R>(stubValue: unknown) {
    return {
      instance: ManagedRuntime.make<R, never>(Layer.empty as Layer.Layer<R>),
      use: () => stubValue as never,
      useFn: () => () => Promise.resolve(stubValue) as never,
      usePush: () => () => Promise.resolve(stubValue) as never,
      useRun: () => undefined as never,
    };
  }

  return { create, createInert };
};

const useRuntimeApiInstance = createSingletonHook(createRuntimeApi);

export const useRuntimeApi = (scopeId: ScopeId) => {
  return useRuntimeApiInstance(scopeId);
};
