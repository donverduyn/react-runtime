import * as React from 'react';
import { Effect, Scope, Exit } from 'effect';
import { RuntimeContext, RuntimeInstance } from 'utils/context';
import {
  getDeps,
  getEffect,
  getRuntime,
  type Fallback,
} from './common/utils.arg';

/*
This hook is used to run an effect in a runtime.
It takes a context and an effect and runs the effect in the runtime provided by the context. It is used by useRuntimeFn. Assumes createRuntimeContext is used to create the context, because it expects a Layer when withRuntime is missing.
*/

export const createRun =
  <R>(
    localContext: RuntimeContext<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeContext<any>, RuntimeInstance<any>>
  ) =>
  <A, E, R1>(
    targetOrEffect:
      | RuntimeInstance<R1>
      | RuntimeContext<R1>
      | Effect.Effect<A, E, R | Scope.Scope>,
    effectOrDeps?:
      | Effect.Effect<A, E, Fallback<R1, R> | Scope.Scope>
      | React.DependencyList,
    deps: React.DependencyList = []
  ) => {
    const finalDeps = getDeps(effectOrDeps, deps);
    const effect = getEffect<Effect.Effect<A, E, R | R1>>(
      targetOrEffect,
      effectOrDeps
    );
    const runtime = getRuntime<R, R1>(targetOrEffect, localContext, instances);

    const hasRun = React.useRef(false);
    const scope = React.useRef<Scope.CloseableScope>(null as never);

    if (!hasRun.current) {
      scope.current = Effect.runSync(Scope.make());
      runtime.runFork(
        effect.pipe(Effect.forkScoped, Scope.extend(scope.current))
      );
      hasRun.current = true;
    }

    React.useEffect(() => {
      if (!hasRun.current) {
        scope.current = Effect.runSync(Scope.make());
        runtime.runFork(
          effect.pipe(Effect.forkScoped, Scope.extend(scope.current))
        );
      }
      return () => {
        runtime.runFork(Scope.close(scope.current, Exit.void));
        hasRun.current = false;
      };
    }, [instances, runtime, ...finalDeps]);
  };
