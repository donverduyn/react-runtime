import { createRuntimeContext } from '@donverduyn/react-runtime';
import { Effect, pipe, Schedule, Layer, Stream } from 'effect';
import { action, observable } from 'mobx';

const incrementer = Effect.gen(function* () {
  const count = yield* Count;
  yield* pipe(
    Stream.fromSchedule(Schedule.fixed(1000)),
    Stream.mapEffect((i) => Effect.sync(action(() => count.set(i)))),
    Stream.runDrain
  );
});

export class Count extends Effect.Service<Count>()('App/Store', {
  effect: Effect.sync(() => observable.box(0)),
}) {}

const layer = pipe(
  Layer.scopedDiscard(incrementer.pipe(Effect.forkScoped)),
  Layer.provideMerge(Count.Default)
);

export const ChildRuntime = createRuntimeContext({ name: 'ChildRuntime' })(
  layer
);
