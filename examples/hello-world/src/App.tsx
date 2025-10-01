import * as React from 'react';
import { useState } from 'react';
import { withRuntime, link } from '@donverduyn/react-runtime';
import * as fromApp from './App.runtime';
import effectLogo from './assets/effect.svg';
import reactLogo from './assets/react.svg';
import { Child } from './components/Child/Child';

import './App.css';
// import { Chunk } from 'effect/Schema';

export type Props = {
  readonly id: string;
};

const withLogger = (component: React.FC<Props>) =>
  link(
    component

    // TODO: test pathological case with cycle and have appropriate error
    // WithRuntime(fromApp.AppRuntime, ({ runtime, props }) => {
    //   return { foo: props.bar }
    // })
    // WithRuntime(fromApp.AppRuntime, ({ runtime, props }) => {
    //   return { bar: props.foo }
    // })
  );

export const App = link(
  AppView,
  withRuntime(fromApp.AppRuntime, ({ configure, props }) => {
    console.log('inside app withruntime', props.id);
    const runtime = configure({ postUnmountTTL: 1000 });
    // const count = runtime.use(Stream.unwrap(fromApp.Count2));
    // console.log(count);
    // return { parentCount: count };
  })
);
// export const Root = link(Child, withProviderScope(App));

export function AppView(props: Props) {
  // const { parentCount } = props as ExtractProps<typeof App>;
  const [visibility, setVisibility] = useState(true);

  return (
    <>
      <div>
        <a href='https://effect.website' rel='noreferrer' target='_blank'>
          <img alt='Effect logo' className='logo effect' src={effectLogo} />
        </a>
        <a href='https://react.dev' rel='noreferrer' target='_blank'>
          <img alt='React logo' className='logo react' src={reactLogo} />
        </a>
      </div>
      <h1>Effect + React</h1>
      <div className='card'>
        <button
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          onClick={() => setVisibility((visible) => !visible)}
          type='button'
        >
          {visibility ? 'Hide Child' : 'Show Child'}
        </button>
        {visibility ? <Child text='foo' /> : null}
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className='read-the-docs'>
        Click on the Effect and React logos to learn more
      </p>
    </>
  );
}
