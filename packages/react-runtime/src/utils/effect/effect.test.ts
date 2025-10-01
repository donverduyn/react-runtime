import {
  Console,
  Context,
  Effect,
  Layer,
  ManagedRuntime,
  pipe,
  Ref,
  Stream,
  Chunk,
} from 'effect';
import { asyncRange } from '@/utils/iterator';
import { getPropTag, createProxy, createProxyStreamMap } from './effect';

describe('effect utils', () => {
  it('should create a subscription ref', async () => {
    const proxy = createProxy({ count: 0, bar: 'foo' });

    type Props = { readonly count: number; bar: string };
    const { PropService } = getPropTag<Props>()(Context.Tag);

    class CountStream extends Effect.Service<CountStream>()('Count', {
      effect: Effect.gen(function* () {
        const { count } = yield* PropService;
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
      Layer.provide(Layer.scoped(PropService, createProxyStreamMap(proxy)))
    );

    const runtime = ManagedRuntime.make(layer);
    // type AvailableProps = PropKey<'count'>;

    // const typedRuntime = enhanceRuntime<AvailableProps>()(runtime);
    void runtime.runPromise(program);

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
    // class Foo extends Effect.Service<Foo>()('Foo', {
    //   effect: Effect.gen(function* () {
    //     yield* Console.log('foo');
    //     return { foo: 'foo' };
    //   }),
    // }) {}
    const createCounter = (value: number = 0) => {
      return class Counter extends Effect.Service<Counter>()('Counter', {
        accessors: true,
        effect: Effect.gen(function* () {
          // const foo = yield* Foo;
          // console.log(foo.foo);
          const ref = yield* Ref.make(value);
          return { increment: Ref.updateAndGet(ref, (n) => n + 1) };
        }),
      }) {};
    };

    const Counter = createCounter();
    const Counter2 = createCounter(100);

    const layer = pipe(
      Counter.Default
      // Layer.merge(Counter2.Default),
      // Layer.provide(Foo.Default)
    );
    const runtime = ManagedRuntime.make(layer);
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
  it('should allow any generated props tag to be used interchangably within the same runtime', () => {
    const PropsTag1 = getPropTag<{ foo: string }>()(Context.Tag);
    const PropsTag2 = getPropTag<{ foo: string }>()(Context.Tag);

    const program = Effect.gen(function* () {
      const { foo } = yield* PropsTag1.PropService;
      return yield* foo.pipe(
        Stream.tap(Console.log),
        Stream.runCollect,
        Effect.andThen(Chunk.toArray)
      );
    });

    const result = Effect.runSync(
      program.pipe(
        Effect.provideService(PropsTag2.PropService, {
          foo: Stream.fromIterable(['foo']),
        })
      )
    );

    expect(result[0]).toBe('foo');
  });
});
