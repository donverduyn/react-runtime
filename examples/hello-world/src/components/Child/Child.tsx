import { withRuntime, withUpstream } from '@donverduyn/react-runtime';
import { pipe, Console } from 'effect';
import * as AppRuntime from '../../App.runtime';
import * as ChildRuntime from './Child.runtime';

type Props = {
  readonly name: string;
  readonly log: (value: string) => void;
};

export const Child = pipe(
  ChildView,
  withUpstream(AppRuntime, () => ({ foo: true })),
  withRuntime(ChildRuntime, ({ configure }) => {
    const runtime = configure({ debug: true });
    const log = runtime.useFn((value: string) => {
      return Console.log('Child mounted', value);
    });
    return { log, name: runtime.use(ChildRuntime.Name) };
  })
);

function ChildView({ name, log }: Props) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <button
        type='button'
        // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
        onClick={() => {
          log('Hello from Child');
        }}
      >
        hello
      </button>
    </div>
  );
}
