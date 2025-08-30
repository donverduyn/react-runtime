import {
  pipe,
  Layer,
  Effect,
  Stream,
  Schedule,
  createRuntimeContext,
} from '@donverduyn/react-runtime';
import { action } from 'mobx';
import { App } from './App';
import { createStore } from './utils/store';
import { randomString } from './utils/string';

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

export class Store extends Effect.Service<Store>()('App/Store2', {
  effect: Effect.sync(createStore),
}) {}

export const reference = () => App;

export const layer = pipe(
  Layer.scopedDiscard(messageToggler.pipe(Effect.forkScoped)),
  Layer.provideMerge(Store.Default)
);

export const context = createRuntimeContext()(layer);
