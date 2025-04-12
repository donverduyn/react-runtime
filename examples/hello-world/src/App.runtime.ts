import { createRuntimeContext } from '@donverduyn/react-runtime';
import { pipe, Layer, Effect, Stream, Context, Schedule } from 'effect';
import type { ObservableMap } from 'mobx';
import { App } from './App';
import { createStore } from './utils/store';

export const references = () => ({ App });

const random = (i: number) => (i % 2 === 0 ? 'Hey!' : 'Hello?');
const messageUpdater = Effect.gen(function* () {
  const store = yield* Store;
  yield* pipe(
    Stream.fromSchedule(Schedule.fixed(1000)),
    Stream.tap((i) => Effect.sync(() => store.set('message', random(i)))),
    Stream.runDrain
  );
});

// eslint-disable-next-line prettier/prettier
export class Store extends Context.Tag(
  'App/Store'
)<Store, ObservableMap<string, string>>() {}

export const context = pipe(
  Layer.scopedDiscard(messageUpdater.pipe(Effect.forkScoped)),
  Layer.provideMerge(Layer.effect(Store, Effect.sync(createStore))),
  createRuntimeContext
);
