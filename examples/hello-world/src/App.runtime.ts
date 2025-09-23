import { createRuntimeContext } from '@donverduyn/react-runtime';
import { pipe, Layer, Effect, Stream, Schedule, Console, Scope } from 'effect';
import { action, observable } from 'mobx';

const countStore = Effect.gen(function* () {
  const count = yield* Count;
  const scope = yield* Scope.make();

  yield* pipe(
    Stream.fromSchedule(Schedule.fixed(1000 / 60)),
    Stream.mapEffect((i) => Effect.sync(action(() => count.set(i)))),
    Stream.tap(() => Console.log('tick')),
    Stream.ensuring(Console.log('ensuring')),
    Stream.runDrain,
    Effect.forkScoped,
    Scope.extend(scope)
  );
});

export class Count extends Effect.Service<Count>()('App/Store', {
  effect: Effect.sync(() => observable.box(0)),
}) {}

export const layer = pipe(
  Layer.scopedDiscard(countStore),
  Layer.provideMerge(Count.Default)
);

console.log('loading file that creates context');
export const AppRuntime = createRuntimeContext({ name: 'AppRuntime' })(layer);
