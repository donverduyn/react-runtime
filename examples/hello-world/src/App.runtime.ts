import {
  getPropTag,
  createRuntimeContext,
  createKey,
} from '@donverduyn/react-runtime';
import { pipe, Effect, Stream, Schedule, Ref, SubscriptionRef, Layer } from 'effect';
import type { Props } from './App';

const { PropService } = getPropTag<Props>();

export class AppCounter extends Effect.Service<AppCounter>()(
  createKey('@App/AppCounter'),
  {
    scoped: Effect.gen(function* () {
      const { id } = yield* PropService;
      const countRef = yield* SubscriptionRef.make(0);

      yield* pipe(
        Stream.fromSchedule(Schedule.fixed(1000)),
        Stream.map((v) => v + 1),
        Stream.tap((v) => Ref.updateAndGet(countRef, () => v)),
        Stream.runDrain,
        Effect.forkScoped
      );
      return pipe(
        Stream.zipLatest(id, countRef.changes),
        Stream.map(([id, value]) => `from ${id}: ${String(value)}`)
      );
    }),
  }
) {}

export class Foo extends Effect.Service<Foo>()('@App/Fooo', {
  effect: Effect.succeed({ foo: 'bar' }),
}) {}

export const layer = pipe(AppCounter.Default.pipe(Layer.merge(Foo.Default)));

export const AppRuntime = createRuntimeContext({ name: 'AppRuntime' })(layer);
