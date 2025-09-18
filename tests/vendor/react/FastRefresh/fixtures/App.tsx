import * as React from 'react';
import { useEffect, useLayoutEffect, useId } from 'react';
import { Child } from './Child';

export default function App() {
  const id = useId();

  const countRef = React.useRef(0);
  const staleCount = countRef.current;

  const [state] = React.useState(() => {
    console.log(`useState: ${String(staleCount)}`);
    return staleCount;
  });
  console.log(`useState result: ${String(state)}`);

  const memo = React.useMemo(() => {
    console.log(`useMemo: ${String(staleCount)}`);
    return staleCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  console.log(`useMemo result: ${String(memo)}`);

  const ref = React.useRef(
    (() => {
      console.log(`useRef: ${String(staleCount)}`);
      return staleCount;
    })()
  );
  console.log(`useRef result: ${String(ref.current)}`);

  const callback = React.useCallback(() => {
    console.log(`useCallback: ${String(staleCount)}`);
    return staleCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  console.log(`useCallback result: ${String(callback())}`);

  useLayoutEffect(() => {
    console.log(`useLayoutEffect: ${String(staleCount)}`);
    return () => {
      console.log(`useLayoutEffect cleanup: ${String(staleCount)}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log(`useEffect: ${String(staleCount)}`);
    return () => {
      console.log(`useEffect cleanup: ${String(staleCount)}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  countRef.current += 1;
  return (
    <div data-testid='app'>
      <Child />
      <span data-testid='inst-id'>{id}</span>
    </div>
  );
}
