import { Console, Effect, Layer, ManagedRuntime, pipe, Stream } from 'effect';
import { asyncRange } from 'utils/iterator';
import { createProxy, createSubscriptionRef } from './effect';

describe('effect utils', () => {
  it('should create a subscription ref', async () => {
    const proxy = createProxy({ count: 0 });

    class Props extends Effect.Service<Props>()('Props', {
      scoped: createSubscriptionRef(proxy),
    }) {}

    class CountStream extends Effect.Service<CountStream>()('Count', {
      dependencies: [Props.Default],
      effect: Effect.gen(function* () {
        const { changes } = yield* Props;
        return changes.pipe(Stream.map((a) => Number(a.count)));
      }),
    }) {}

    class CountStream2 extends Effect.Service<CountStream2>()('Count', {
      dependencies: [Props.Default],
      effect: Effect.gen(function* () {
        const { changes } = yield* Props;
        return changes.pipe(Stream.map((a) => Number(a.count)));
      }),
    }) {}

    const output: number[] = [];
    const program = Effect.gen(function* () {
      const stream = yield* CountStream;
      const stream2 = yield* CountStream2;
      yield* stream2.pipe(
        // Stream.tap((value) => Effect.succeed(output.push(value))),
        Stream.tap((v) => Console.log('from stream2', v)),
        Stream.runDrain,
        Effect.fork
      );
      yield* stream.pipe(
        Stream.tap((value) => Effect.succeed(output.push(value))),
        Stream.tap((v) => Console.log('from stream', v)),
        Stream.runDrain
      );
    });

    const layer = pipe(CountStream.Default, Layer.merge(CountStream2.Default));
    const runtime = ManagedRuntime.make(layer);
    void runtime.runPromise(program);

    for await (const index of asyncRange(1, 5, 100)) {
      proxy.count = index;
    }

    // flush changes
    await Effect.runPromise(Effect.sleep(0));

    // closes scope
    void runtime.dispose();

    // doesn't happen
    proxy.count = 1000;

    const expected = [0, 1, 2, 3, 4, 5];
    expect(output).toStrictEqual(expected);
  });
});
