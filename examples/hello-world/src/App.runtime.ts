import {
  pipe,
  Layer,
  Effect,
  Stream,
  Schedule,
  createRuntimeContext,
} from '@donverduyn/react-runtime';
import { action, observable } from 'mobx';
import { App } from './App';

const countStore = Effect.gen(function* () {
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

export const reference = () => App;

export const layer = pipe(
  Layer.scopedDiscard(countStore.pipe(Effect.forkScoped)),
  Layer.provideMerge(Count.Default)
);

export const context = createRuntimeContext()(layer);
