import { Effect, Layer, ManagedRuntime } from 'effect';

describe('ManagedRuntime', () => {
  it('should call addFinalizer on disposal, when runtime is used.', async () => {
    const finalizeFn = vi.fn();
    const layer = Layer.scopedDiscard(
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() => Effect.sync(finalizeFn));
      })
    );

    const runtime = ManagedRuntime.make(layer);
    expect(finalizeFn).toHaveBeenCalledTimes(0);

    await runtime.dispose();
    expect(finalizeFn).toHaveBeenCalledTimes(0);

    const runtime2 = ManagedRuntime.make(layer);
    expect(finalizeFn).toHaveBeenCalledTimes(0);

    runtime2.runSync(Effect.succeed(true));
    await runtime2.dispose();

    // addFinalizer is only called on used runtimes.
    expect(finalizeFn).toHaveBeenCalledTimes(1);
  });
});
