import * as React from 'react';
import { Effect } from 'effect';
import type { RuntimeContext, RuntimeInstance } from 'components/common/types';
import { getRuntimeInstance as getRuntimeInstance } from './common/utils.arg';
import type { RuntimeKey } from './useRuntimeProvider/types';

export const createUse =
  <R>(
    localContext: RuntimeContext<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeKey, RuntimeInstance<any>>
  ) =>
  <A, E>(effect: Effect.Effect<A, E, R>, deps: React.DependencyList = []) => {
    const instance = getRuntimeInstance<R>(effect, localContext, instances);
    // think about wether we want to implement a more specific solution for updating downstream components when upstream dependencies change.
    const instanceDeps = Array.from(instances.values()).filter(Boolean);
    return React.useMemo(
      () => instance.runtime.runSync(effect),
      [instanceDeps, instance, ...deps]
    );
  };
