import {
  withUpstream,
  link,
  withRuntime,
  type ExtractProps,
} from '@donverduyn/react-runtime';
import { observer } from 'mobx-react-lite';
import * as fromApp from '../../App.runtime';
import * as fromChild from './Child.runtime';

type Props = {
  readonly getName: () => number;
  readonly log: (value: string) => void;
};

export const Child = link(
  observer(ChildView),
  withUpstream(({ inject }) => {
    const count = inject(fromApp.Runtime).use(fromApp.Count);
    // const id = inject(fromApp.Runtime).use(
    //   // pipe(
    //   fromApp.Id.pipe(Stream.unwrap)
    // );
    // console.log({ id });
    // TODO: instead of lifting the function into a stream and using push/pull conversion, consider just a single synchronous effect call so we can sycnhronously obtain a stream. in most cases the push/pull conversion doesn't make sense anyway, so we might want to either have a method or a different way to chose between sync or push/pull. previously we thought about having something like rxjs with switchMap, mergeMap, concatMap, exhaustMap, because the essence of push pull is really, do you want the effect to control the pace, or the consumer.

    // const fn1 = inject(AppRuntime).useFn(() =>
    //   Effect.sync(() => Stream.fromSchedule(Schedule.fixed(2000)))
    // );

    // TODO: support stream directly in useRun, so we don't have to lift it into an effect first and call runDrain.
    // inject(ChildRuntime).useRun(
    //   Effect.promise(fn1).pipe(
    //     Effect.andThen(Stream.tap((s) => Console.log(s)))
    //   )
    // );

    return { getName: () => count.get() };
  }),
  withRuntime(fromChild.ChildRuntime, ({ runtime }) => {
    runtime.use(fromChild.Count); // Count can rely on Props from the layer which reads from the proxy. Since this function is processed in the last hoc, together with the others, at every step we need the proxy to be available, but we can think about when we are going to pull from the proxy. the thing is, we can't really defer executation of runtime.use, since we currently rely on synchronously having the return here, which also means we must have the props available, wo we have to choices, accept you cannot have a canonical set of props available, OR bubble up through these functions such that the resulting props are backfilled at each step using partial application
    return { log: (value: string) => console.log('Child log:', value) };
  })

  // withRuntime(ChildRuntime, () => {}),
  // withRuntime(ChildRuntime, () => ({}))
);

function ChildView(props: Props) {
  const { getName, log } = props as ExtractProps<typeof Child>;
  return (
    <div>
      <h2>{getName()}</h2>
      {/* eslint-disable-next-line react-perf/jsx-no-new-function-as-prop */}
      <button onClick={() => log('foo')} type='button'>
        Log
      </button>
    </div>
  );
}
