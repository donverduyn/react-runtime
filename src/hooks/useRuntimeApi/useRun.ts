import * as React from 'react';
import { Effect, Scope, Exit } from 'effect';
import type { RuntimeContext, RuntimeInstance } from 'components/common/types';
import type { RuntimeKey } from '../useRuntimeProvider/types';

/*
This hook is used to run an effect in a runtime.
It takes a context and an effect and runs the effect in the runtime provided by the context. It is used by useRuntimeFn. Assumes createRuntimeContext is used to create the context, because it expects a Layer when withRuntime is missing.
*/

export const createRun =
  <R>(
    localContext: RuntimeContext<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeKey, RuntimeInstance<any>>
  ) =>
  <A, E>(
    effect: Effect.Effect<A, E, R | Scope.Scope>,
    deps: React.DependencyList = []
  ) => {
    const instance = instances.get(localContext.key)!;
    const instanceDeps = Array.from(instances.values()).filter(Boolean);
    const hasRun = React.useRef(false);
    const scope = React.useRef<Scope.CloseableScope>(null as never);

    if (!hasRun.current) {
      scope.current = Effect.runSync(Scope.make());
      instance.runtime.runFork(
        effect.pipe(Effect.forkScoped, Scope.extend(scope.current))
      );
      hasRun.current = true;
    }

    React.useEffect(() => {
      if (!hasRun.current) {
        scope.current = Effect.runSync(Scope.make());
        instance.runtime.runFork(
          effect.pipe(Effect.forkScoped, Scope.extend(scope.current))
        );
      }
      return () => {
        instance.runtime.runFork(Scope.close(scope.current, Exit.void));
        hasRun.current = false;
      };
    }, [instanceDeps, instance, ...deps]);
  };
