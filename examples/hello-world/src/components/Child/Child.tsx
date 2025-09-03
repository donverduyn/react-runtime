import * as React from 'react';
import {
  withUpstream,
  connect,
  withRuntime,
  type ExtractProps,
} from '@donverduyn/react-runtime';
import { observer } from 'mobx-react-lite';
import * as AppRuntime from '../../App.runtime';
import * as ChildRuntime from './Child.runtime';

type Props = {
  readonly getName: () => number;
  readonly log: (value: string) => void;
};

export const Child = connect(
  observer(ChildView),
  // withUpstream(({ inject, props }, React) => {
  //   const count = inject(AppRuntime).use(AppRuntime.Count);
  //   return { getName: () => count.get() };
  // }),

  withRuntime(ChildRuntime, () => {
    return { fooz: 'bar' };
  }),
  withUpstream(AppRuntime, ({ runtime }, props) => {
    const count = runtime.use(AppRuntime.Count);
    return { getName: () => count.get() };
  }),
  // // withRuntime(ChildRuntime),

  withRuntime(ChildRuntime, () => {}),
  withRuntime(ChildRuntime, () => ({}))
);

function ChildView(props: Props) {
  const { getName, log } = props as ExtractProps<typeof Child>;

  console.log('Child rendered', Date.now());
  React.useEffect(() => {
    console.log('Child mounted', Date.now());
    return () => {
      console.log('Child unmounted', Date.now());
    };
  }, []);
  return (
    <div>
      <h2>{getName()}</h2>
      <button onClick={() => log('foo')} type='button'>
        Log
      </button>
    </div>
  );
}
