import { useState } from 'react';
import { withRuntime } from '@donverduyn/react-runtime';
import { pipe, type Context } from 'effect';
import * as AppRuntime from './App.runtime';  
import { Observer } from 'mobx-react-lite';
import reactLogo from './assets/react.svg';
// eslint-disable-next-line import/no-unresolved
import viteLogo from '/vite.svg';
import './App.css';

export const App = pipe(
  AppView,
  withRuntime(AppRuntime, (configure) => {
    const runtime = configure();
    return { store: runtime.use(AppRuntime.Store) };
  })
);

type Props = {
  readonly store: Context.Tag.Service<AppRuntime.Store>;
  readonly initialCount: number;
};

export function AppView({ store, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);

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

export default App;
