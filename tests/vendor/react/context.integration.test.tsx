import React from 'react';
import { render } from '@testing-library/react';

describe('context', () => {
  it('should be able to infer the type from the context', () => {
    const Context = React.createContext<string | undefined>(undefined);

    const Component: React.FC = () => {
      const value = React.useContext(Context);
      return <div>{value}</div>;
    };

    const { getByText } = render(
      <Context.Provider value='Hello, World!'>
        <Component />
      </Context.Provider>
    );

    expect(getByText('Hello, World!')).toBeDefined();
  });
});
