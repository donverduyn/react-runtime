import type { RuntimeInstance, RuntimeModule } from 'components/common/types';
import type { RuntimeKey } from 'hooks/useRuntimeProvider/types';
import { createUse } from './hooks/use';
import { createFn } from './hooks/useFn';
import { createRun } from './hooks/useRun';

export const useRuntimeApi = () => {
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

  return { create };
};
