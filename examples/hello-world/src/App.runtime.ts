import { getPropsTag, createRuntimeContext } from '@donverduyn/react-runtime';
import {
  pipe,
  Layer,
  Effect,
  Stream,
  Schedule,
  Console,
  Context,
} from 'effect';
import { action, observable } from 'mobx';

export type Props = {
  readonly id: string;
  readonly store: Count;
};

const { PropService } = getPropsTag<Props>()(Context.Tag);

export class Id extends Effect.Service<Id>()('App/Id', {
  effect: Effect.gen(function* () {
    console.log('testtest');
    const { id } = yield* PropService;
    return id.pipe(Stream.map((v) => v));
  }),
}) {}

export class Count extends Effect.Service<Count>()('App/Count', {
  effect: Effect.sync(() => observable.box(0)),
}) {}

const incrementer = Effect.gen(function* () {
  const count = yield* Count;
  yield* pipe(
    Stream.fromSchedule(Schedule.fixed(1000)),
    Stream.mapEffect((i) => Effect.sync(action(() => count.set(i)))),
    Stream.tap(() => Console.log('tick')),
    Stream.ensuring(Console.log('ensuring')),
    Stream.runDrain,
    Effect.forkScoped
  );
});

// const proxy = createProxy<Props>({
//   id: '123',
//   store: Count.Service,
// });

export const layer = pipe(
  Layer.scopedDiscard(incrementer),
  Layer.provideMerge(Count.Default)
  // Layer.merge(Id.Default),
  // Layer.provide(
  //   Layer.scoped(
  //     PropService,
  //     createProxyStreamMap(proxy, (key) => {
  //       // console.log(key);
  //     })
  //   )
  // )
);

// console.log('loading file that creates context');

//* we want to extend the layer when we call register on runtimeRegistry, so we can add the PropService and keep a reference to the proxy, which we store on the instance object itself. This way, we can access the proxy and write updated props to it on every re-render in useEntryBuilder
export const Runtime = createRuntimeContext({ name: 'AppRuntime' })(layer);
