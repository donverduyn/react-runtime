// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable react/jsx-filename-extension */
import * as React from 'react';

type Props = {
  readonly children?: React.ReactNode;
  renderFn: (props: Omit<Props, 'renderFn'>) => React.ReactNode;
};

export const OffTreeContainer: React.FC<Props> = React.memo(
  function OffTreeContainer(props) {
    const { renderFn, ...rest } = props;
    // const [value, setValue] = React.useState<string | null>(store.value);

    React.useEffect(() => {
      // return store.subscribe(() => setValue(store.value));
    }, []);

    // return (
    // <ValueContext.Provider value={value}>{children}</ValueContext.Provider>
    // );

    return renderFn(rest);
  }
);
