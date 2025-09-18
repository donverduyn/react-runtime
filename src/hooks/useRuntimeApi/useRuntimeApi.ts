import { Layer, ManagedRuntime } from 'effect';
import type {
  RuntimeInstance,
  RuntimeKey,
  RuntimeModule,
  ScopeId,
} from '@/types';
import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';
import { createUse } from './hooks/use';
import { createFn } from './hooks/useFn';
import { createRun } from './hooks/useRun';

const createRuntimeApi = () => {
  function create<R>(
    module: RuntimeModule<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeKey, RuntimeInstance<any>>
  ) {
    return {
      instance: instances.get(module.context.key)!.runtime,
      use: createUse(module.context, instances),
      useFn: createFn(module.context, instances),
      useRun: createRun(module.context, instances),
    };
  }

  function createInert<R>(stubValue: unknown) {
    return {
      instance: ManagedRuntime.make<R, never>(Layer.empty as Layer.Layer<R>),
      use: () => stubValue as never,
      useFn: () => () => Promise.resolve(stubValue) as never,
      useRun: () => undefined as never,
    };
  }

  return { create, createInert };
};

const useRuntimeApiInstance = createSingletonHook(createRuntimeApi);

export const useRuntimeApi = (scopeId: ScopeId) => {
  return useRuntimeApiInstance(scopeId);
};
