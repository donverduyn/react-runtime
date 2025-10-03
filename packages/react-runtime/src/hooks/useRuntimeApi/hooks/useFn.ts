// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Effect, Scope, Exit } from 'effect';
import type { RuntimeContext, RuntimeInstance, RuntimeKey } from '@/types';
import type { PropService } from 'utils/effect';
import { tryFnSync } from 'utils/function';

/*
This hook returns a function that can be called to trigger an effect.
It returns a promise that resolves to the value of the effect.
*/

// --- Helper types
type InferArgs<F> = F extends (...args: infer A) => any ? A : never;
type InferReturn<F> = F extends (...args: any[]) => infer R ? R : never;

export function createFn<R>(
  localContext: RuntimeContext<R, never, PropService>,
  instance: Map<RuntimeKey, RuntimeInstance<any>>
): {
  <Fn extends (...args: any[]) => Effect.Effect<any, any, any>>(
    target: Fn
  ): (
    ...args: InferArgs<Fn>
  ) => InferReturn<Fn> extends Effect.Effect<infer A, any, any>
    ? Effect.Effect<A>
    : never;

  // <R1, Fn extends (...args: any[]) => Effect.Effect<any, any, any>>(
  //   target: RuntimeContext<R1> | RuntimeInstance<R1>,
  //   fn: Fn,
  //   deps?: React.DependencyList
  // ): (
  //   ...args: InferArgs<Fn>
  // ) => Promise<
  //   InferReturn<Fn> extends Effect.Effect<infer A, any, any> ? A : never
  // >;
};

export function createFn<R>(
  localContext: RuntimeContext<R, never, PropService>,
  instances: Map<RuntimeKey, RuntimeInstance<any>>
) {
  return <T extends unknown[], A, E>(
    fn: (...args: T) => Effect.Effect<A, E, R | Scope.Scope>,
    deps: React.DependencyList = []
  ) => {
    const runtime = instances.get(localContext.key)!;
    const runtimeDeps = Array.from(instances.values()).filter(Boolean);

    // TODO: hooks like this might be generalizable on the container level, so we have single hook that takes dependencies from arguments to update when needed. Maybe just use a dictionary to hold multiple values, and find a way to associate them with their dependencies. We might be able to use useSyncExternalStore, which gives more control over when to update/write/read

    // TODO: same thing here, we likely need some kind of store that registers values together with deps but where we can have a single hook for ALL runtime APis and just inject the hook its api into them so we can use it.

    const scopeRef = React.useRef<Scope.CloseableScope | null>(
      Effect.runSync(Scope.make())
    );

    React.useEffect(() => {
      if (scopeRef.current === null) {
        scopeRef.current = Effect.runSync(Scope.make());
      }
      return () => {
        runtime.runtime.runFork(Scope.close(scopeRef.current!, Exit.void));
        scopeRef.current = null;
      };
    }, [runtime, ...deps]);

    return React.useCallback((...args: T) => {
      const result = tryFnSync(() => runtime.runtime.runSync(fn(...args)));
      return !(result instanceof Error)
        ? Effect.succeed(result)
        : Effect.async<A>((resume) => {
            runtime.runtime.runFork(
              fn(...args).pipe(Effect.tap((v) => resume(Effect.succeed(v)))),
              { scope: scopeRef.current! }
            );
          });
    }, []);
  };
}
