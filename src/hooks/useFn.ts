// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Effect, pipe, Stream, Scope, Exit } from 'effect';
import type { IsUnknown } from 'type-fest';
import type { RuntimeContext, RuntimeInstance } from 'components/common/types';
import { EventEmitter, createAsyncIterator } from 'utils/emitter';
import {
  getDeps,
  getEffectFn,
  getRuntime,
  type Fallback,
  type Fallback2,
} from './common/utils.arg';

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

export const createFn =
  <R>(
    localContext: RuntimeContext<R>,
    instances: Map<RuntimeContext<any>, RuntimeInstance<any>>
  ) =>
  <T extends unknown[], T1 extends unknown[], A, A1, E, E1, R1>(
    targetOrEffect:
      | RuntimeInstance<R1>
      | RuntimeContext<R1>
      | ((...args: T) => Effect.Effect<A, E, R | Scope.Scope>),
    fnOrDeps?:
      | ((...args: T1) => Effect.Effect<A1, E1, Fallback<R1, R> | Scope.Scope>)
      | React.DependencyList,
    deps: React.DependencyList = []
  ) => {
    const finalDeps = getDeps(fnOrDeps, deps);
    const effectFn = getEffectFn<
      (...args: Sanitize<T> | T1) => Effect.Effect<A | A1, E | E1, R | R1>
    >(targetOrEffect, fnOrDeps);

    const runtime = getRuntime<R, R1>(targetOrEffect, localContext, instances);
    const fnRef = React.useRef(effectFn);

    React.useEffect(() => {
      fnRef.current = effectFn;
    }, [instances, runtime, effectFn, ...finalDeps]);

    const emitter = React.useMemo(
      () => new EventEmitter<[...(Sanitize<T> | T1)], A | A1>(),

      [instances, runtime, ...finalDeps]
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

      [instances, runtime, ...finalDeps]
    );

    React.useEffect(() => {
      const scope = Effect.runSync(Scope.make());
      runtime.runFork(stream.pipe(Effect.forkScoped, Scope.extend(scope)));
      return () => {
        runtime.runFork(Scope.close(scope, Exit.void));
      };
    }, [instances, runtime, emitter, ...finalDeps]);

    return emitter.emit as IsUnknown<Fallback<T1, Sanitize<T>>> extends true
      ? () => Promise<Fallback<A1, A>>
      : (...args: Fallback2<T1, Sanitize<T>>) => Promise<Fallback<A1, A>>;
  };
