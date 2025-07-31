// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Effect, pipe, Stream, Scope, Exit } from 'effect';
import type {
  RuntimeContext,
  RuntimeInstance,
  RuntimeModule,
} from 'components/common/types';
import { EventEmitter, createAsyncIterator } from 'utils/emitter';
import {
  getDeps,
  getEffectFn,
  getRuntimeInstance,
  type Fallback,
  type Fallback2,
} from './common/utils.arg';
import type { RuntimeKey } from './useRuntimeProvider/types';

/*
This hook returns a function that can be called to trigger an effect.
It returns a promise that resolves to the value of the effect.
*/

type InvalidShapes =
  | React.ProviderProps<any>
  | React.Context<any>
  | { Provider: unknown }
  | undefined;

type Sanitize<T> = T extends InvalidShapes
  ? unknown
  : T extends [infer Head, ...infer Tail]
    ? [Sanitize<Head>, ...Sanitize<Tail>]
    : T;

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

  <R1, Fn extends (...args: any[]) => Effect.Effect<any, any, any>>(
    target: RuntimeModule<R1> | RuntimeInstance<R1>,
    fn: Fn,
    deps?: React.DependencyList
  ): (
    ...args: InferArgs<Fn>
  ) => Promise<
    InferReturn<Fn> extends Effect.Effect<infer A, any, any> ? A : never
  >;
};

export function createFn<R>(
  localContext: RuntimeContext<R>,
  instances: Map<RuntimeKey, RuntimeInstance<any>>
) {
  return <T extends unknown[], T1 extends unknown[], A, A1, E, E1, R1>(
    targetOrEffect:
      | RuntimeInstance<R1>
      | RuntimeModule<R1>
      | ((...args: T) => Effect.Effect<A, E, R | Scope.Scope>),
    fnOrDeps?:
      | ((...args: T1) => Effect.Effect<A1, E1, Fallback<R1, R> | Scope.Scope>)
      | React.DependencyList,
    deps: React.DependencyList = []
  ) => {
    const finalDeps = getDeps(fnOrDeps, deps);
    const effectFn = getEffectFn<
      Fallback2<T1, Sanitize<T>>,
      Effect.Effect<A | A1, E | E1, R | R1>
    >(targetOrEffect, fnOrDeps);

    const instance = getRuntimeInstance<R, R1>(
      targetOrEffect,
      localContext,
      instances
    );
    const instanceDeps = Array.from(instances.values()).filter(Boolean);
    const fnRef = React.useRef(effectFn);

    React.useEffect(() => {
      fnRef.current = effectFn;
    }, [instanceDeps, instance, effectFn, ...finalDeps]);

    const emitter = React.useMemo(
      () => new EventEmitter<[...Fallback2<T1, Sanitize<T>>], A | A1>(),
      [instanceDeps, instance, ...finalDeps]
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
      [instanceDeps, instance, ...finalDeps]
    );

    React.useEffect(() => {
      const scope = Effect.runSync(Scope.make());
      instance.runtime.runFork(
        stream.pipe(Effect.forkScoped, Scope.extend(scope))
      );
      return () => {
        instance.runtime.runFork(Scope.close(scope, Exit.void));
      };
    }, [instanceDeps, instance, emitter, ...finalDeps]);

    // Return function with preserved param names
    type Args = Fallback2<T1, Sanitize<T>>;
    type Result = Promise<Fallback<A1, A>>;

    return emitter.emit as (...args: Args) => Result;
  };
}
