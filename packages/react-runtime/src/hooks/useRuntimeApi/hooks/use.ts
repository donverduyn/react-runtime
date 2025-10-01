import * as React from 'react';
import {
  Effect,
  Exit,
  Scope,
  Stream,
  type ManagedRuntime,
  Option,
} from 'effect';
import type { RuntimeFiber } from 'effect/Fiber';
import moize from 'moize';
import type { RuntimeContext, RuntimeInstance, RuntimeKey } from '@/types';
import { isStream } from '@/utils/effect/stream';
import type { InferSuccess, PropService } from 'utils/effect';

const create = moize.shallow(
  <A, E, R>(runtime: ManagedRuntime.ManagedRuntime<R, never>) =>
    (
      effectOrStream: Effect.Effect<A, E, R> | Stream.Stream<A, E, R>,
      onSuccess: (value: A) => void
    ) => {
      const stream = isStream(effectOrStream)
        ? effectOrStream
        : !Effect.isEffect(effectOrStream)
          ? Stream.empty
          : Stream.unwrap(
              effectOrStream.pipe(
                Effect.andThen((a) => {
                  const result = isStream(a)
                    ? a
                    : Stream.fromEffect(Effect.succeed(a));
                  return result as Stream.Stream<A, E, R>;
                })
              )
            );

      const scope = Effect.runSync(Scope.make());
      try {
        const first = runtime.runSync(Stream.runHead(stream));
        if (Option.isSome(first)) {
          onSuccess(first.value);
        }
      } catch {
        // swallow if effect/stream is async-only
      }
      const fiber = runtime.runFork(
        stream.pipe(
          Stream.tap((v) => Effect.sync(() => onSuccess(v))),
          Stream.runDrain
        ),
        { scope }
      );
      return { fiber, scope };
    }
);

const useFork = <R>(runtime: ManagedRuntime.ManagedRuntime<R, never>) => {
  return { create: create(runtime) };
};

export const createUse =
  <R, P>(
    localContext: RuntimeContext<R, never, PropService>,
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

    const stateRef = React.useRef<InferSuccess<A> | null>(null);
    const fiber = React.useMemo(
      () =>
        fork.create(effect, (value) => {
          stateRef.current = value as InferSuccess<A>;
          // setState(value as InferSuccess<A>);
        }),
      []
    );
    const [state, setState] = React.useState<InferSuccess<A> | null>(
      () => stateRef.current
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
          setState(value as InferSuccess<A>);
        });
      }
      return () => {
        Effect.runFork(Scope.close(fiberRef.current!.scope, Exit.void));
        fiberRef.current = null;
      };
    }, []);

    return state!;
  };
