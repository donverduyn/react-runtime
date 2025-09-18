import {
  createRuntimeContext,
  pipe,
  Layer,
  Effect,
  Schedule,
  Stream,
} from '@donverduyn/react-runtime';
import { action, observable } from 'mobx';
import { Child } from './Child';

// export const reference = () => Child;

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

export const context = pipe(
  Layer.scopedDiscard(incrementer.pipe(Effect.forkScoped)),
  Layer.provideMerge(Count.Default),
  createRuntimeContext({ name: 'ChildRuntime' })
);
