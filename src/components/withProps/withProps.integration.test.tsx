import * as React from 'react';
import { render } from '@testing-library/react';
import { pipe as link } from 'effect';
import { describe, it } from 'vitest';
import { WithProps } from './withProps';

type ComponentProps = {
  readonly value: string;
};

const ComponentView: React.FC<ComponentProps> = ({ value }) => (
  <div>
    <span>{value}</span>
  </div>
);

const text = 'parent-text';
// function fn<
//   C extends React.FC<any>,
//   T extends Partial<React.ComponentProps<C>> & Record<string, unknown>,
// >(component: C, arg: T): T {
//   return arg;
// }

// const Comp: React.FC<{ bar: string }> = () => <div>foo</div>;

// const foo = fn(Comp, { bar: 'bar', foo: 'foo' });
// T is inferred as { foo: string } ✅

describe('withProps', () => {
  it('should render the wrapped component', () => {
    const Component = link(
      () => <div>{text}</div>,
      WithProps(() => ({}))
    );

    const { getByText } = render(<Component id='test' />);
    expect(getByText(text)).toBeDefined();
  });
  it('should inject props into wrapped component', () => {
    const Component = link(
      ComponentView,
      WithProps(() => ({ value: text }))
    );

    const { getByText } = render(<Component id='test' />);
    expect(getByText(text)).toBeDefined();
  });

  it('should allow props to be computed from other props', () => {
    const Component = link(
      (props: { name: string; value: string }) => <div>{props.value}</div>,
      WithProps((props) => ({ name: props.value ?? 'default-name' }))
    );

    const { getByText } = render(<Component id='test' value={text} />);
    expect(getByText(text)).toBeDefined();
  });

  it.todo('should compose multiple withProps HOCs');

  it.todo('should allow props to override previously injected props');

  it.todo('should handle conditional prop injection, using hooks');
});
