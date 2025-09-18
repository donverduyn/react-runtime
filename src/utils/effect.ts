import { Ref, Stream, SubscriptionRef, Effect, pipe } from 'effect';

// export const foo = 'bar';

export const createProxy = <
  T extends {
    subscribe: (fn: (value: V) => void) => () => void;
    [key: string]: unknown;
  },
  V extends Record<string, unknown>,
>(
  value: V
) =>
  new Proxy<T>(
    Object.assign({}, value) as T,
    (() => {
      const getSubscribers = new Set<(t: T) => void>();
      return {
        get: (() => {
          return (target, prop) => {
            if (prop === 'subscribe') {
              return (subscriber: (t: T) => void) => {
                getSubscribers.add(subscriber as never);
                return () => getSubscribers.delete(subscriber);
              };
            }
            return Reflect.get(target, prop);
          };
        })(),
        set: (target, prop, value) => {
          const result = Reflect.set(target, prop, value);
          getSubscribers.forEach((fn) => fn(target));
          return result;
        },
      };
    })()
  );

export const proxyState = createProxy({});

export const createSubscriptionRef = <
  T extends {
    subscribe: (fn: (value: V) => void) => () => void;
    [key: string]: unknown;
  },
  V extends Record<string, unknown>,
>(
  proxyState: T & V
) =>
  SubscriptionRef.make<V>(proxyState).pipe(
    Effect.andThen((ref) =>
      Effect.gen(function* () {
        const stream = pipe(
          Stream.asyncPush<V>((emit) =>
            Effect.acquireRelease(
              Effect.sync(() =>
                proxyState.subscribe((target) => {
                  emit.single(Object.assign({}, target));
                })
              ),
              (unsubscribe) => {
                return Effect.sync(() => {
                  unsubscribe();
                  emit.end();
                });
              }
            )
          ),
          Stream.tap((value) => {
            return ref.pipe(Ref.updateAndGet(() => value));
          })
        );

        yield* stream.pipe(Stream.runDrain, Effect.forkScoped);
        return ref;
      })
    )
  );
