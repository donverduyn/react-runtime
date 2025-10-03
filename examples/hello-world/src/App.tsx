import { useState } from 'react';
import { withRuntime } from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import { AppRuntime } from './App.runtime';
import effectLogo from './assets/effect.svg';
import reactLogo from './assets/react.svg';
import { Child } from './components/Child/Child';
import './App.css';

export type Props = {
  readonly id: string;
};

export const App = pipe(
  AppView,
  withRuntime(AppRuntime, ({ configure }) => {
    configure({ postUnmountTTL: 1000 });
  })
);

export function AppView(_: Props) {
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
