import type React from 'react';
import {
  Console,
  Context,
  Effect,
  Layer,
  ManagedRuntime,
  pipe,
  Ref,
  Stream,
} from 'effect';
import { asyncRange } from '@/utils/iterator';
import {
  createPropsTag,
  createProxy,
  createProxyStreamMap,
  enhanceRuntime,
  type PropKey,
} from './effect';

describe('effect utils', () => {
  it('should create a subscription ref', async () => {
    const proxy = createProxy({ count: 0, bar: 'foo' });

    type Component = React.FC<{ readonly count?: number }> & {
      _props: { bar: string };
    };

    const Props = createPropsTag<Component>()(Context.Tag);

    class CountStream extends Effect.Service<CountStream>()('Count', {
      effect: Effect.gen(function* () {
        const { count } = yield* Props;
        return count.pipe(Stream.map((a) => a * 2));
      }),
    }) {}

    const output: number[] = [];
    const program = Effect.gen(function* () {
      const stream = yield* CountStream;
      yield* stream.pipe(
        Stream.tap((value) => Effect.succeed(output.push(value))),
        Stream.tap((v) => Console.log('from stream', v)),
        Stream.runDrain
      );
    });

    const layer = pipe(
      CountStream.Default,
      Layer.provide(Layer.scoped(Props, createProxyStreamMap(proxy)))
    );

    const runtime = ManagedRuntime.make(layer);
    type AvailableProps = PropKey<'count'>;

    const typedRuntime = enhanceRuntime<AvailableProps>()(runtime);
    void typedRuntime.runPromise(program);

    for await (const index of asyncRange(1, 5, 1)) {
      proxy.count = index;
      await Effect.runPromise(Effect.sleep(0));
    }

    // closes scope
    void runtime.dispose();
    // doesn't happen
    proxy.count = 1000;

    const expected = [0, 2, 4, 6, 8, 10];
    expect(output).toStrictEqual(expected);
  });

  it('should swap a layer service and use the new service inside the effect', async () => {
    const createCounter = (value: number = 0) => {
      return class Counter extends Effect.Service<Counter>()('Counter', {
        accessors: true,
        effect: Ref.make(value).pipe(
          Effect.map((ref) => ({
            increment: Ref.updateAndGet(ref, (n) => n + 1),
          }))
        ),
      }) {};
    };

    const Counter = createCounter();
    const Counter2 = createCounter(100);

    const runtime = ManagedRuntime.make(Counter.Default);
    const increment = Effect.andThen(Counter, ({ increment }) => increment);

    const counter = await runtime.runPromise(increment);
    expect(counter).toBe(1);

    // inc is actually executed using Counter2,
    // which means we increment from 100, and not from 0.
    const counter2 = await runtime.runPromise(
      increment.pipe(
        Effect.provide(Counter2.Default),
        Effect.updateService(Counter, () => Counter2.Service)
      )
    );
    expect(counter2).toBe(101);

    const counterAgain = await runtime.runPromise(increment);
    expect(counterAgain).toBe(2);

    // Dispose runtime
    void runtime.dispose();
  });
});
