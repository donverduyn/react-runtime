import React from 'react';
import { render } from '@testing-library/react';

describe('children', () => {
  it('should return the same children from JSX, as the ones received in the component', () => {
    let received: React.ReactNode | undefined;

    const Leaf: React.FC = () => <span>Leaf</span>;

    const Component: React.FC<{ readonly children: React.ReactNode }> = ({
      children,
    }) => {
      received = children;
      return <div>{children}</div>;
    };

    const element = Component({
      children: <Leaf />,
    });

    const elementProps = React.isValidElement(element)
      ? (element.props as React.PropsWithChildren)
      : undefined;

    // set received to the children prop of the element
    render(
      <Component>
        <Leaf />
      </Component>
    );

    expect(elementProps?.children).toStrictEqual(received);
  });
  it('should have a children property without children', () => {
    const Component: React.FC<{ readonly children?: React.ReactNode }> = ({
      children,
    }) => {
      return <div>{children}</div>;
    };

    const element = Component({});
    const elementProps = React.isValidElement(element)
      ? (element.props as React.PropsWithChildren)
      : undefined;

    expect(elementProps?.children).toBeUndefined();
  });
});
