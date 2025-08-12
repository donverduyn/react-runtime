import * as React from 'react';
import { withRuntime, withUpstream, connect, withProps } from '@donverduyn/react-runtime';
import { Console } from 'effect';
import { observer } from 'mobx-react-lite';
import * as AppRuntime from '../../App.runtime';
import * as ChildRuntime from './Child.runtime';

type Props = {
  readonly getName: () => string;
  // readonly log: (value: string) => void;
};

export const Child = connect(
  observer(ChildView),
  withUpstream(AppRuntime, ({ runtime }) => {
    const store = runtime.use(AppRuntime.Store);
    return { getName: () => store.get('message') };
  }),
  withProps(() => ({ getName: () => 'Child Component' })),
  // withRuntime(ChildRuntime, ({ configure }, props) => {
  //   const runtime = configure({ debug: true });
  //   return {
  //     log: runtime.useFn((value: string) =>
  //       Console.log(`${value} ${props.getName?.() ?? ''}`)
  //     ),
  //   };
  // })
);

function ChildView({ getName
 }: Props) {
    console.log('Child rendered', Date.now());
    React.useEffect(() => {
      console.log('Child mounted', Date.now());
      return () => {
        console.log('Child unmounted', Date.now());
      }
    })
  return (
    <div>
      <h2>{getName()}</h2>
    </div>
  );
}
