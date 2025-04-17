import { useState } from 'react';
import { withRuntime, withUpstream } from '@donverduyn/react-runtime';
import { pipe, type Context } from 'effect';
import * as SomeRuntime from './Some.runtime';
import { Child } from './components/Child/Child';
import { Observer } from 'mobx-react-lite';
import * as AppRuntime from './App.runtime';
import reactLogo from './assets/react.svg';
// eslint-disable-next-line import/no-unresolved
import viteLogo from '/vite.svg';
import './App.css';

const withLogger = <C extends React.FC<Props>>(component: C) =>
  pipe(
    component,
    withUpstream(SomeRuntime, ({ runtime }, props) => {
      console.log('SomeRuntime', runtime.runtime.id);
    }),
    withRuntime(AppRuntime, ({ configure }) => {
      const runtime = configure({ postUnmountTTL: 1000 });
      console.log('AppRuntime', runtime.runtime);
      return { store: runtime.use(AppRuntime.Store) };
    })
  );

export const App = pipe(
  AppView,
  // withStatic({ foo: 'bar' }),
  withLogger
);

type Props = {
  readonly store: Context.Tag.Service<AppRuntime.Store>;
};

export function AppView({ store }: Props) {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a
          href='https://vite.dev'
          rel='noreferrer'
          target='_blank'
        >
          <img
            alt='Vite logo'
            className='logo'
            src={viteLogo}
          />
        </a>
        <a
          href='https://react.dev'
          rel='noreferrer'
          target='_blank'
        >
          <img
            alt='React logo'
            className='logo react'
            src={reactLogo}
          />
        </a>
      </div>
      <h1>Vite + React + Effect + Mobx</h1>
      <div className='card'>
        {}
        <Child />
        <Observer render={() => <h2>{store.get('message')}</h2>} />
        <button
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          onClick={() => setCount((count) => count + 1)}
          type='button'
        >
          count is {count}
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
