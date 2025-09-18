import * as React from 'react';
import type { Extensible } from "types";
import { useStableObject } from './shared/useStableObject';

// Accumulates and merges props across renders for the component.
export const useStatefulMerger = <T extends Extensible<Record<string, unknown>>>(
  initial: T
) => {
  const accumulated = React.useRef<T>({ ...initial });

  const update = React.useCallback((props: Partial<T>) => {
    Object.assign(accumulated.current, props);
    return { ...accumulated.current };
  }, []);

  const reset = React.useCallback(() => {
    accumulated.current = { ...initial };
  }, [initial]);

  const get = React.useCallback(() => {
    return { ...accumulated.current };
  }, []);

  return useStableObject({ update, reset, get });
};