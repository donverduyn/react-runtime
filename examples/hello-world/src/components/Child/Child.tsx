import * as React from 'react';
import {
  withUpstream,
  link,
  withRuntime,
  type ExtractProps,
} from '@donverduyn/react-runtime';
// import { Effect, Schedule, Stream } from 'effect';
import { observer } from 'mobx-react-lite';
import * as AppRuntime from '../../App.runtime';
import * as ChildRuntime from './Child.runtime';

type Props = {
  readonly getName: () => number;
  readonly log: (value: string) => void;
};

export const Child = link(
  observer(ChildView),
  withUpstream(({ inject, props }) => {
    const count = inject(AppRuntime).use(AppRuntime.Count);

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
  withRuntime(ChildRuntime, ({ runtime }) => {
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
      <button onClick={() => log('foo')} type='button'>
        Log
      </button>
    </div>
  );
}
