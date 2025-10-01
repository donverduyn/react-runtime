import {
  link,
  withRuntime,
  withUpstream,
  type ExtractProps,
} from '@donverduyn/react-runtime';
import { AppCounter, AppRuntime } from '../../App.runtime';
import { ChildRuntime, ChildText } from './Child.runtime';

export type Props = {
  readonly text: string;
};

export const Child = link(
  ChildView,
  withUpstream(({ inject, props }) => {
    const appRuntime = inject(AppRuntime);
    const count = appRuntime.use(AppCounter);

    // TODO: instead of lifting the function into a stream and using push/pull conversion, consider just a single synchronous effect call so we can sycnhronously obtain a stream. in most cases the push/pull conversion doesn't make sense anyway, so we might want to either have a method or a different way to chose between sync or push/pull. previously we thought about having something like rxjs with switchMap, mergeMap, concatMap, exhaustMap, because the essence of push pull is really, do you want the effect to control the pace, or the consumer.

    // TODO: support stream directly in useRun, so we don't have to lift it into an effect first and call runDrain.

    // const appStream = inject(AppRuntime).useFn((delay: number) =>
    //   Stream.fromSchedule(Schedule.fixed(delay))
    // );

    // const value = inject(fromChild.ChildRuntime).useFn((delay: number) =>
    //   pipe(
    //     appStream(delay),
    //     Stream.map((s) => s + 1)
    //   )
    // );

    return { text: count };
  }),
  withRuntime(ChildRuntime, ({ runtime }) => {
    const text = runtime.use(ChildText);
    // return { text };
  })

  // withRuntime(ChildRuntime, () => {}),
  // withRuntime(ChildRuntime, () => ({}))
);

function ChildView(props: Props) {
  const { text } = props as ExtractProps<typeof Child>;
  return (
    <div>
      <h2>{text}</h2>
    </div>
  );
}
