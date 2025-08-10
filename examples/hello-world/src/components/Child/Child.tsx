import { withRuntime, withUpstream, connect } from '@donverduyn/react-runtime';
import { Console } from 'effect';
import { observer } from 'mobx-react-lite';
import * as AppRuntime from '../../App.runtime';
import * as ChildRuntime from './Child.runtime';

type Props = {
  readonly getName: () => string;
  readonly log: (value: string) => void;
};

export const Child = connect(
  observer(ChildView),
  withUpstream(AppRuntime, ({ runtime }) => {
    const store = runtime.use(AppRuntime.Store);
    return { getName: () => store.get('message') };
  }),
  withRuntime(ChildRuntime, ({ configure }, props) => {
    const runtime = configure({ debug: true });
    return {
      log: runtime.useFn((value: string) =>
        Console.log(`${value} ${props.getName?.() ?? ''}`)
      ),
    };
  })
);

function ChildView({ getName, log }: Props) {
  return (
    <div>
      <button
        type='button'
        onClick={() => {
          log(`Child component received:`);
        }}
      >
        Click me
      </button>
      <h2>{getName()}</h2>
    </div>
  );
}
