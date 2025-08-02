import * as React from 'react';
import type { Simplify } from 'type-fest';
import { getDisplayName } from 'utils/react';

//TODO: the idea of withId, is that you can supply a function to create an id from existing props, which allows ids to be provided from the hoc chain, instead of the component props, as long as they are stable across remounts. if you don't supply a function, it will just use the id prop as is. In both cases it returns the component inside a context provider that sets the provided id as the parent id for any descendant components.

export const withId =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <C extends React.FC<any>>(
      fn: (
        props: Simplify<Partial<React.ComponentProps<C>> & { id: string }>
      ) => string
    ) =>
    (Component: C) => {
      function Wrapped(
        props: React.ComponentProps<C> & { readonly id: string }
      ) {
        const id = fn(props);
        const mergedProps = Object.assign({}, props, { id });
        return (
          <div>
            <Component {...(mergedProps as React.ComponentProps<C>)} />
          </div>
        );
      }
      Wrapped.displayName = getDisplayName(Component, 'withId');
      return Wrapped;
    };
