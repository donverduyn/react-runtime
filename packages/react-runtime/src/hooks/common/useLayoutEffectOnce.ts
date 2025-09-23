import * as React from 'react';

export const useLayoutEffectOnce = <R>(fn: () => R) => {
  const disposed = React.useRef(false);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  React.useLayoutEffect(() => {
    if (!disposed.current) {
      fnRef.current();
    } else {
      disposed.current = false;
    }
    return () => {
      disposed.current = true;
    };
  }, []);
};
