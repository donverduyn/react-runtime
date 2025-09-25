import * as React from 'react';
import { useState } from 'react';
import { withRuntime, link } from '@donverduyn/react-runtime';
import * as fromApp from './App.runtime';
import effectLogo from './assets/effect.svg';
import mobxLogo from './assets/mobx.svg';
import reactLogo from './assets/react.svg';
import { Child } from './components/Child/Child';
// eslint-disable-next-line import/no-unresolved
import viteLogo from '/vite.svg';
import './App.css';
// import { Chunk } from 'effect/Schema';

const withLogger = (component: React.FC<fromApp.Props>) =>
  link(
    component,
    withRuntime(fromApp.Runtime, ({ configure }) => {
      const runtime = configure({ postUnmountTTL: 1000 });
      // void runtime.instance.runPromise(
      //   fromApp.Id.pipe(
      //     Stream.unwrap,
      //     Stream.runCollect
      //   )
      // );
      // void runtime.instance.runSync(
      //   Effect.sync(() => Promise.resolve(true))
      // );
      // console.log({ id });
      return {
        store: runtime.use(fromApp.Count),
      };
    })
    // TODO: test pathological case with cycle and have appropriate error
    // WithRuntime(fromApp.AppRuntime, ({ runtime, props }) => {
    //   return { foo: props.bar }
    // })
    // WithRuntime(fromApp.AppRuntime, ({ runtime, props }) => {
    //   return { bar: props.foo }
    // })
  );

export const App = link(AppView, withLogger);
// export const Root = link(Child, WithProviderScope(App));

export function AppView(_: fromApp.Props) {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href='https://vite.dev' rel='noreferrer' target='_blank'>
          <img alt='Vite logo' className='logo' src={viteLogo} />
        </a>
        <a href='https://react.dev' rel='noreferrer' target='_blank'>
          <img alt='React logo' className='logo react' src={reactLogo} />
        </a>
        <a href='https://effect.website' rel='noreferrer' target='_blank'>
          <img alt='React logo' className='logo effect' src={effectLogo} />
        </a>
        <a href='https://mobx.js.org' rel='noreferrer' target='_blank'>
          <img alt='React logo' className='logo mobx' src={mobxLogo} />
        </a>
      </div>
      <h1>Vite + React + Effect + Mobx</h1>
      <div className='card'>
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
