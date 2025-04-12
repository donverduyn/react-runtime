import type { Simplify } from 'type-fest';
import { copyStaticProperties } from 'utils/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WithStaticFn<T, C extends React.FC<any>> = (
  Component: C
) => React.FC<Simplify<React.ComponentProps<C>>> & T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withStatic<C extends React.FC<any>, T extends Record<any, any>>(
  staticProperties: T
): WithStaticFn<T, C> {
  return (Component: C) => {
    copyStaticProperties(
      staticProperties,
      Component as Record<string, unknown>
    );
    return Component as unknown as React.FC<Simplify<React.ComponentProps<C>>> &
      T;
  };
}
