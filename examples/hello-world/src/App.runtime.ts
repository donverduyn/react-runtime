import {
  pipe,
  Layer,
  Effect,
  Stream,
  Schedule,
  Console,
  createRuntimeContext,
  Scope,
} from '@donverduyn/react-runtime';
// import { Scope } from 'effect';
import { action, observable } from 'mobx';

const countStore = Effect.gen(function* () {
  const count = yield* Count;
  const scope = yield* Scope.make();
  yield* pipe(
    Stream.fromSchedule(Schedule.fixed(1000)),
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

export const context = createRuntimeContext({ name: 'AppRuntime' })(layer);
