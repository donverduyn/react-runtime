import { createRuntimeContext } from '@donverduyn/react-runtime';
import { pipe, Layer, Effect, Stream, Context, Schedule } from 'effect';
import { action, type ObservableMap } from 'mobx';
import { App } from './App';
import { createStore } from './utils/store';
import { randomString } from './utils/string';

export const reference = () => App;

const messageToggler = Effect.gen(function* () {
  const store = yield* Store;
  yield* pipe(
    Stream.fromSchedule(Schedule.fixed(1000)),
    Stream.mapEffect((i) =>
      Effect.sync(action(() => store.set('message', randomString(i))))
    ),
    Stream.runDrain
  );
});

export class Store extends Context.Tag('App/Store')<
  Store,
  ObservableMap<string, string>
>() {}

export const context = pipe(
  Layer.scopedDiscard(messageToggler.pipe(Effect.forkScoped)),
  Layer.provideMerge(Layer.effect(Store, Effect.sync(createStore))),
  createRuntimeContext({})
);
