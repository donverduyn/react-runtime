import * as React from 'react';

export const useResolveAfterRender = (
  resolve: (() => void) | (() => () => void),
  timeoutMs: number = 50
) => {
  const hasRun = React.useRef(false);
  const resolved = React.useRef(false);
  if (!hasRun.current) {
    hasRun.current = true;
    queueMicrotask(() => {
      if (!resolved.current) {
        const cleanup = resolve();
        if (cleanup) cleanup();
      }
    });
  }
  React.useLayoutEffect(() => {
    let cleanup = null as (() => void) | null;
    const id = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      cleanup = resolve() ?? null;
      resolved.current = true;
    }, timeoutMs);
    return () => {
      clearTimeout(id);
      if (cleanup) cleanup();
    };
  }, []);
};
