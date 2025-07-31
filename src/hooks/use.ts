import * as React from 'react';
import { Effect } from 'effect';
import type {
  RuntimeContext,
  RuntimeInstance,
  RuntimeModule,
} from 'components/common/types';
import {
  type Fallback,
  getDeps,
  getEffect,
  getRuntimeInstance as getRuntimeInstance,
} from './common/utils.arg';
import type { RuntimeKey } from './useRuntimeProvider/types';

export const createUse =
  <R>(
    localContext: RuntimeContext<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeKey, RuntimeInstance<any>>
  ) =>
  <A, E, R1>(
    targetOrEffect:
      | RuntimeInstance<R1>
      | RuntimeModule<R1>
      | Effect.Effect<A, E, R>,
    effectOrDeps?: Effect.Effect<A, E, Fallback<R1, R>> | React.DependencyList,
    deps: React.DependencyList = []
  ) => {
    const finalDeps = getDeps(effectOrDeps, deps);
    const effect = getEffect<Effect.Effect<A, E, R | R1>>(
      targetOrEffect,
      effectOrDeps
    );
    const instance = getRuntimeInstance<R, R1>(
      targetOrEffect,
      localContext,
      instances
    );
    // think about wether we want to implement a more specific solution for updating downstream components when upstream dependencies change.
    const instanceDeps = Array.from(instances.values()).filter(Boolean);
    return React.useMemo(
      () => instance.runtime.runSync(effect),
      [instanceDeps, instance, ...finalDeps]
    );
  };
