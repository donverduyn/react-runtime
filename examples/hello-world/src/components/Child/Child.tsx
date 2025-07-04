import { withRuntime, withUpstream } from '@donverduyn/react-runtime';
import { pipe, Console } from 'effect';
import * as AppRuntime from '../../App.runtime';
import * as ChildRuntime from './Child.runtime';
import * as Tags from './Child.tags';

type Props = {
  readonly name: string;
  readonly log: (value: string) => void;
};

export const Child = pipe(
  ChildView,
  withUpstream(AppRuntime, () => ({
    foo: true,
  })),
  withRuntime(ChildRuntime, ({ configure }) => {
    const runtime = configure({ debug: true });

    const log = runtime.useFn((value: string) =>
      Console.log('Child mounted', value)
    );
    return { log, name: runtime.use(Tags.Name) };
  })
);

function ChildView({ name, log }: Props) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <button
        type='button'
        onClick={() => {
          log('Hello from Child');
        }}
      >
        hello
      </button>
    </div>
  );
}
