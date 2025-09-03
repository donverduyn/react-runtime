import * as React from 'react';
import { useState } from 'react';
import { withRuntime, connect } from '@donverduyn/react-runtime';
import * as AppRuntime from './App.runtime';
import reactLogo from './assets/react.svg';
import { Child } from './components/Child/Child';
// eslint-disable-next-line import/no-unresolved
import viteLogo from '/vite.svg';
import './App.css';

const withLogger = (component: React.FC<Props>) =>
  connect(
    component,
    // withUpstream(SomeRuntime, ({ runtime }) => {
    //   console.log('SomeRuntime', runtime.instance );[]
    // }),
    withRuntime(AppRuntime, ({ configure }) => {
      const runtime = configure({ postUnmountTTL: 1000 });
      return { store: runtime.use(AppRuntime.Count) };
    })
  );

export const App = connect(AppView, withLogger);

type Props = {
  readonly store: AppRuntime.Count;
};

export function AppView({ store }: Props) {
  const [count, setCount] = useState(0);
  console.log('App rendered', Date.now());
  React.useEffect(() => {
    console.log('App mounted', Date.now());
    return () => {
      console.log('App unmounted', Date.now());
    };
  });
  return (
    <>
      <div>
        <a href='https://vite.dev' rel='noreferrer' target='_blank'>
          <img alt='Vite logo' className='logo' src={viteLogo} />
        </a>
        <a href='https://react.dev' rel='noreferrer' target='_blank'>
          <img alt='React logo' className='logo react' src={reactLogo} />
        </a>
      </div>
      <h1>Vite + React + Effect + Mobx</h1>
      <div className='card'>
        {/* @ts-expect-error wrong signature for jsx */}
        {count % 2 === 0 ? <Child id='2' /> : null}
        <button
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          onClick={() => setCount((count) => count + 1)}
          type='button'
        >
          {count % 2 === 0 ? 'Show Child' : 'Hide Child'}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className='read-the-docs'>
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}
