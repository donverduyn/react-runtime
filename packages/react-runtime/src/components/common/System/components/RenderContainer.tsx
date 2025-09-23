// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable react/jsx-filename-extension */
import * as React from 'react';

type Props = {
  // readonly Target: T;
  // readonly props: Map<keyof React.ComponentProps<T>, any>;
  readonly renderFn: () => React.ReactNode;
};

// intentionally uses a props property to mutate props during render.
// we use this to allow siblings to populate instance maps.

export const RenderContainer = React.memo(function RenderContainer(
  Rprops: Props
) {
  const { renderFn } = Rprops;
  // return (
  //   <Target
  //     {...(Object.fromEntries(props) as React.ComponentProps<T>)}
  //     {...rest}
  //   />
  // );
  return renderFn();
});
