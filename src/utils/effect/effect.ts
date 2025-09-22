import { Stream, Effect, Deferred, Context, type ManagedRuntime } from 'effect';
import moize from 'moize';
import type { Simplify } from 'type-fest';
import type { ExtractStaticProps, Subscribable, SubscribeFn, Key } from 'types';

export const createProxy = <T extends Record<string, unknown>>(value: T) =>
  new Proxy<Subscribable<NoInfer<T>> & T>(
    Object.assign({}, value) as Subscribable<NoInfer<T>> & T,
    (() => {
      const map = new Map<Key, Set<SubscribeFn<T[keyof T]>>>();
      return {
        get: (target, prop) => {
          if (prop === 'subscribe') {
            return (key: Key, fn: SubscribeFn<T[keyof T]>) => {
              if (!map.has(key)) map.set(key, new Set());
              map.get(key)!.add(fn);
              return () => {
                map.get(key)!.delete(fn);
                if (map.get(key)!.size === 0) map.delete(key);
              };
            };
          }
          if (prop === 'value') return target;
          return Reflect.get(target, prop);
        },
        set: (target, prop, value) => {
          const result = Reflect.set(target, prop, value);
          const byProp = map.get(prop);
          if (byProp) byProp.forEach((fn) => fn(value as T[keyof T]));
          return result;
        },
      };
    })()
  );

// assume all properties that are needed, are enumerable on proxyState, if not values later still update refs that start with undefined, but we filter undefined away.
export const createProxyStreamMap = <
  T extends Record<Exclude<string, keyof Subscribable<NoInfer<T>>>, unknown>,
>(
  proxyState: Subscribable<T> & T
) =>
  Effect.gen(function* () {
    const deferred = yield* Deferred.make();
    yield* Effect.addFinalizer(() => Deferred.succeed(deferred, true));
    return new Proxy<{ [K in keyof T]: Stream.Stream<T[K]> }>({} as never, {
      get: moize.shallow((_, prop) =>
        Stream.merge(
          Stream.fromIterable([proxyState[prop as keyof T]]),
          Stream.asyncPush<T[keyof T]>((emit) =>
            Effect.acquireRelease(
              Effect.sync(() => proxyState.subscribe(prop, emit.single)),
              Effect.fn((unsubscribe) => Effect.sync(unsubscribe))
            )
          ).pipe(Stream.interruptWhenDeferred(deferred))
        ).pipe(Stream.filter((value) => value !== undefined))
      ),
    });
  });

export type PropKey<K extends string | symbol> = { __propKey: K };

export const enhanceRuntime =
  <RProps>() =>
  <R, E>(runtime: ManagedRuntime.ManagedRuntime<R, E>) =>
    runtime as ManagedRuntime.ManagedRuntime<R | RProps, E>;

export const getPropsTag = moize.shallow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <C extends React.FC<any>>() =>
    class Props extends Context.Tag('Props')<
      Props,
      Simplify<
        {
          [K in Exclude<
            keyof React.ComponentProps<C> & (string | symbol),
            keyof ExtractStaticProps<C>
          >]: Stream.Stream<
            NonNullable<React.ComponentProps<C>[K]>,
            never,
            PropKey<K>
          >;
        } & {
          [K in keyof ExtractStaticProps<C> & (string | symbol)]: Stream.Stream<
            ExtractStaticProps<C>[K],
            never,
            PropKey<K>
          >;
        }
      >
    >() {}
);
