import * as React from 'react';
import { render } from '@testing-library/react';
import { Context } from 'effect';
import { describe, it, expect } from 'vitest';
import { withProps } from 'components/withProps/withProps';
import { mockRuntimeModule } from 'tests/utils/mockRuntimeModule';
import { connect } from '../../utils/runtime';
import { withRuntime } from './withRuntime';

class Tag extends Context.Tag('TestTag')<Tag, string>() {}

const value = 'life is a journey, death a destination.';

const TextView: React.FC<{ readonly text: string }> = (props) => {
  return <div>{props.text}</div>;
};

describe('withRuntime', () => {
  it('should render the wrapped component', () => {
    const Runtime = mockRuntimeModule(Tag, '')(() => Component);
    const Component = connect(TextView, withRuntime(Runtime));

    const screen = render(<Component id='test' text={value} />);
    screen.debug();
    expect(screen.getByText(value)).toBeDefined();
  });

  it('should render with two withRuntime HOCs', () => {
    const Runtime1 = mockRuntimeModule(Tag, value)(() => Component);
    const Runtime2 = mockRuntimeModule(Tag, value)(() => Component);
    const Component = connect(
      TextView,
      withRuntime(Runtime1),
      withRuntime(Runtime2)
    );

    const { getByText } = render(<Component id='test' text={value} />);
    expect(getByText(value)).toBeDefined();
  });

  it('should allow component to use its own runtime if provided', () => {
    const Runtime = mockRuntimeModule(Tag, value)(() => Component);
    
    const Component = connect(
      TextView,
      withRuntime(Runtime, ({ runtime }) => ({
        text: runtime.use(Tag),
      }))
    );

    const { getByText, debug } = render(<Component id='component' />);
    debug();
    expect(getByText(value)).toBeDefined();
  });

  it('should pass runtime prop to the wrapped component', () => {
    const Runtime = mockRuntimeModule(Tag, value)(() => Component);

    const Component = connect(
      (props: { name: string }) => <div>{props.name}</div>,
      withRuntime(Runtime, ({ runtime }) => ({
        name: runtime.use(Tag),
      }))
    );

    const { getByText } = render(<Component id='component' />);
    expect(getByText(value)).toBeDefined();
  });

  it('should forward other props to the wrapped component', () => {
    const Runtime = mockRuntimeModule(Tag, value)(() => Component);
    const Component = connect(TextView, withRuntime(Runtime));

    const { getByText } = render(<Component id='test' text={value} />);
    expect(getByText(value)).toBeDefined();
  });

  it('should preserve displayName for debugging', () => {
    const Runtime = mockRuntimeModule(Tag, value)(() => Component);
    const Component = connect(TextView, withRuntime(Runtime));

    expect(Component.displayName).toBe('withRuntime(TextView)');
  });

  it('should make props available from the first hoc to the second', () => {
    const Runtime = mockRuntimeModule(Tag, value)(() => Component);
    const Component = connect(
      (props: { name: string }) => <div>{props.name}</div>,
      withRuntime(Runtime, ({ runtime }) => ({
        foo: runtime.use(Tag),
      })),
      withProps((props) => ({
        name: props.foo,
      }))
    );

    const { getByText } = render(<Component id='test' />);
    expect(getByText(value)).toBeDefined();
  });
});
