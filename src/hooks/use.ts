import * as React from 'react';
import { Effect } from 'effect';
import { RuntimeContext, RuntimeInstance } from 'utils/context';
import {
  type Fallback,
  getDeps,
  getEffect,
  getRuntime,
} from './common/utils.arg';

export const createUse =
  <R>(
    localContext: RuntimeContext<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeContext<any>, RuntimeInstance<any>>
  ) =>
  <A, E, R1>(
    targetOrEffect:
      | RuntimeInstance<R1>
      | RuntimeContext<R1>
      | Effect.Effect<A, E, R>,
    effectOrDeps?: Effect.Effect<A, E, Fallback<R1, R>> | React.DependencyList,
    deps: React.DependencyList = []
  ) => {
    const finalDeps = getDeps(effectOrDeps, deps);
    const effect = getEffect<Effect.Effect<A, E, R | R1>>(
      targetOrEffect,
      effectOrDeps
    );
    const runtime = getRuntime<R, R1>(targetOrEffect, localContext, instances);

    return React.useMemo(
      () => runtime.runSync(effect),
      [instances, runtime, ...finalDeps]
    );
  };
