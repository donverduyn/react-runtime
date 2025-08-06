// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Effect, pipe, Stream, Scope, Exit } from 'effect';
import type { RuntimeContext, RuntimeInstance } from 'types';
import { EventEmitter, createAsyncIterator } from 'utils/emitter';
import type { RuntimeKey } from 'types';

/*
This hook returns a function that can be called to trigger an effect.
It returns a promise that resolves to the value of the effect.
*/

// --- Helper types
type InferArgs<F> = F extends (...args: infer A) => any ? A : never;
type InferReturn<F> = F extends (...args: any[]) => infer R ? R : never;

export function createFn<R>(
  localContext: RuntimeContext<R>,
  instances: Map<RuntimeKey, RuntimeInstance<any>>
): {
  <Fn extends (...args: any[]) => Effect.Effect<any, any, any>>(
    target: Fn
  ): (
    ...args: InferArgs<Fn>
  ) => Promise<
    InferReturn<Fn> extends Effect.Effect<infer A, any, any> ? A : never
  >;

  // <R1, Fn extends (...args: any[]) => Effect.Effect<any, any, any>>(
  //   target: RuntimeModule<R1> | RuntimeInstance<R1>,
  //   fn: Fn,
  //   deps?: React.DependencyList
  // ): (
  //   ...args: InferArgs<Fn>
  // ) => Promise<
  //   InferReturn<Fn> extends Effect.Effect<infer A, any, any> ? A : never
  // >;
};

export function createFn<R>(
  localContext: RuntimeContext<R>,
  instances: Map<RuntimeKey, RuntimeInstance<any>>
) {
  return <T extends unknown[], A, E>(
    fn: (...args: T) => Effect.Effect<A, E, R | Scope.Scope>,
    deps: React.DependencyList = []
  ) => {
    const instance = instances.get(localContext.key)!;
    const instanceDeps = Array.from(instances.values()).filter(Boolean);
    const fnRef = React.useRef(fn);

    React.useEffect(() => {
      fnRef.current = fn;
    }, [instanceDeps, instance, fn, ...deps]);

    const emitter = React.useMemo(
      () => new EventEmitter<T, A>(),
      [instanceDeps, instance, ...deps]
    );

    const stream = React.useMemo(
      () =>
        pipe(
          Stream.fromAsyncIterable(createAsyncIterator(emitter), () => {}),
          Stream.mapEffect(({ data, eventId }) =>
            pipe(
              fnRef.current(...data),
              Effect.tap((v) => emitter.resolve(eventId)(v))
            )
          ),
          Stream.runDrain
        ),
      [instanceDeps, instance, ...deps]
    );

    React.useEffect(() => {
      const scope = Effect.runSync(Scope.make());
      instance.runtime.runFork(
        stream.pipe(Effect.forkScoped, Scope.extend(scope))
      );
      return () => {
        instance.runtime.runFork(Scope.close(scope, Exit.void));
      };
    }, [instanceDeps, instance, emitter, ...deps]);

    return emitter.emit as (...args: T) => Promise<A>;
  };
}
