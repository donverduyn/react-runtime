// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Effect, pipe, Stream, Scope, Exit } from 'effect';
import type { RuntimeContext, RuntimeInstance, RuntimeKey } from '@/types';
import { EventEmitter, createAsyncIterator } from 'utils/emitter';

/*
This hook returns a function that can be called to trigger an effect.
It returns a promise that resolves to the value of the effect.
*/

// --- Helper types
type InferArgs<F> = F extends (...args: infer A) => any ? A : never;
type InferReturn<F> = F extends (...args: any[]) => infer R ? R : never;

export function createFn<R>(
  localContext: RuntimeContext<R>,
  instance: Map<RuntimeKey, RuntimeInstance<any>>
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

    // TODO: hooks like this might be generalizable on the container level, so we have single hook that takes dependencies from arguments to update when needed. Maybe just use a dictionary to hold multiple values, and find a way to associate them with their dependencies. We might be able to use useSyncExternalStore, which gives more control over when to update/write/read
    React.useEffect(() => {
      fnRef.current = fn;
    }, [instanceDeps, instance, fn, ...deps]);

    const emitter = React.useMemo(
      () => new EventEmitter<T, A>(),
      [instanceDeps, instance, ...deps]
    );

    // TODO: same thing here, we likely need some kind of store that registers values together with deps but where we can have a single hook for ALL runtime APis and just inject the hook its api into them so we can use it.
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
      // TODO: check if we can delegate this to the container in which we call buildEntries, because we don't want to have extra hooks here, since we don't know how much inject calls will be used over time.
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

type Subscriber = () => void;

export class MultiMemoStore<T> {
  private values = new Map<string, T>();
  private subscribers = new Map<string, Set<Subscriber>>();

  set(key: string, value: T) {
    this.values.set(key, value);
    this.notify(key);
  }

  get(key: string): T | undefined {
    return this.values.get(key);
  }

  subscribe(key: string, cb: Subscriber) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(cb);
  }

  unsubscribe(key: string, cb: Subscriber) {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.delete(cb);
      if (subs.size === 0) {
        this.subscribers.delete(key);
      }
    }
  }

  private notify(key: string) {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach((cb) => cb());
    }
  }
}

function useMultiMemoStore<T>(keys: string[], store: MultiMemoStore<T>) {
  return React.useSyncExternalStore(
    (cb) => {
      // Subscribe to changes for any key
      keys.forEach((key) => store.subscribe(key, cb));
      return () => keys.forEach((key) => store.unsubscribe(key, cb));
    },
    () => keys.map((key) => store.get(key))
  );
}

const store = new MultiMemoStore<number>();
store.set('a', 1);
store.set('b', 2);

// const values = useMultiMemoStore(['a', 'b'], store);
// values will be [1, 2]
