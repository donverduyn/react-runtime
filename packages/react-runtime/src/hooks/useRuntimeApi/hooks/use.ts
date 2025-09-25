import * as React from 'react';
import { Effect, Exit, Scope, Stream, type ManagedRuntime } from 'effect';
import type { RuntimeFiber } from 'effect/Fiber';
import moize from 'moize';
import type { RuntimeContext, RuntimeInstance, RuntimeKey } from '@/types';
import { isStream } from '@/utils/effect/stream';

const create = moize.shallow(
  <A, E, R>(runtime: ManagedRuntime.ManagedRuntime<R, never>) =>
    (
      effectOrStream: Effect.Effect<A, E, R> | Stream.Stream<A, E, R>,
      onSuccess: (value: A) => void
    ) => {
      const scope = Effect.runSync(Scope.make());
      const fiber = runtime.runSync(
        Effect.gen(function* () {
          const effect = isStream<A, E, R>(effectOrStream)
            ? effectOrStream.pipe(
                Stream.tap((a) => Effect.sync(() => onSuccess(a))),
                Stream.runDrain
              )
            : effectOrStream.pipe(Effect.tap(onSuccess));
          return yield* effect.pipe(Effect.forkScoped, Scope.extend(scope));
        })
      );
      // runtime.runFork(Effect.promise(() => Promise.resolve(true)));
      return { fiber, scope };
    }
);

const useFork = <R>(runtime: ManagedRuntime.ManagedRuntime<R, never>) => {
  return { create: create(runtime) };
};

export const createUse =
  <R, P>(
    localContext: RuntimeContext<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instances: Map<RuntimeKey, RuntimeInstance<any, P>>
  ) =>
  // consider whether we ant to filter away constituents or provide them through runtime method signature
  <A, E>(
    effect: Effect.Effect<A, E, R> | Stream.Stream<A, E, R>,
    deps: React.DependencyList = []
  ) => {
    const instance = instances.get(localContext.key)!;
    // think about wether we want to implement a more specific solution for updating downstream components when upstream dependencies change.
    const fork = useFork(instance.runtime);

    const [state, setState] = React.useState<A | null>(null);
    const fiber = React.useMemo(
      () =>
        fork.create(effect, (value) => {
          setState(value as A);
        }),
      []
    );
    const fiberRef = React.useRef<{
      fiber: RuntimeFiber<void, unknown>;
      scope: Scope.CloseableScope;
    } | null>(fiber);

    // TODO:  instanceDeps is not very accurate, we should think what's the best way to guarantee updates when any dependencies change, but maybe scoping the instance map could already help at buildEntries.
    const instanceDeps = Array.from(instances.values()).filter(Boolean);

    React.useEffect(() => {
      if (fiberRef.current === null) {
        fiberRef.current = fork.create(effect, (value) => {
          setState(value as A);
        });
      }
      return () => {
        Effect.runSync(Scope.close(fiberRef.current!.scope, Exit.void));
        fiberRef.current = null;
      };
    }, [instanceDeps, instance, ...deps]);

    return state!;
  };
