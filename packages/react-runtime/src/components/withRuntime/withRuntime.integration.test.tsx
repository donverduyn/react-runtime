import * as React from 'react';
import { render } from '@testing-library/react';
import { Context } from 'effect';
import { describe, it, expect } from 'vitest';
import { WithProps } from '@/components/withProps/withProps';
import { mockRuntimeModule } from '@/tests/utils/mockRuntimeModule';
import { link } from '../../utils/effect/runtime';
import { WithRuntime } from './withRuntime';

class Tag extends Context.Tag('TestTag')<Tag, string>() {}

const value = 'life is a journey, death a destination.';

const TextView: React.FC<{ readonly text: string }> = (props) => {
  return <div>{props.text}</div>;
};

describe('withRuntime', () => {
  it('should render the wrapped component', () => {
    const Runtime = mockRuntimeModule(Tag, '');
    const Component = link(TextView, WithRuntime(Runtime));

    const { getByText } = render(<Component id='test' text={value} />);
    expect(getByText(value)).toBeDefined();
  });

  it('should render with two withRuntime HOCs', () => {
    const Runtime1 = mockRuntimeModule(Tag, value);
    const Runtime2 = mockRuntimeModule(Tag, value);
    const Component = link(
      TextView,
      WithRuntime(Runtime1),
      WithRuntime(Runtime2)
    );

    const { getByText } = render(<Component id='test' text={value} />);
    expect(getByText(value)).toBeDefined();
  });

  it('should allow component to use its own runtime if provided', () => {
    const Runtime = mockRuntimeModule(Tag, value);

    const Component = link(
      TextView,
      WithRuntime(Runtime, ({ runtime }) => ({
        text: runtime.use(Tag),
      }))
    );

    const { getByText } = render(<Component id='component' />);
    expect(getByText(value)).toBeDefined();
  });

  it('should pass runtime prop to the wrapped component', () => {
    const Runtime = mockRuntimeModule(Tag, value);

    const Component = link(
      (props: { name: string }) => <div>{props.name}</div>,
      WithRuntime(Runtime, ({ runtime }) => ({
        name: runtime.use(Tag),
      }))
    );

    const { getByText } = render(<Component id='component' />);
    expect(getByText(value)).toBeDefined();
  });

  it('should forward other props to the wrapped component', () => {
    const Runtime = mockRuntimeModule(Tag, value);
    const Component = link(TextView, WithRuntime(Runtime));

    const { getByText } = render(<Component id='test' text={value} />);
    expect(getByText(value)).toBeDefined();
  });

  it('should preserve displayName for debugging', () => {
    const Runtime = mockRuntimeModule(Tag, value);
    const Component = link(TextView, WithRuntime(Runtime));

    expect(Component.displayName).toBe('withRuntime(TextView)');
  });

  it.todo(
    'should make props available from the first hoc to the second',
    () => {
      const Runtime = mockRuntimeModule(Tag, value);
      const Component = link(
        (props: { name: string }) => <div>{props.name}</div>,
        WithRuntime(Runtime, ({ runtime }) => ({
          foo: runtime.use(Tag),
        })),
        // TODO: we should track the prop access using a proxy, to order the provider functions. this guarantees that anything that is requested is actually available, while we do not have to think about what has to come first
        WithProps((props) => ({
          name: props.foo,
        }))
      );

      const { getByText } = render(<Component id='test' />);
      expect(getByText(value)).toBeDefined();
    }
  );

  it('should allow configure to create an instance of the runtime', () => {
    const Runtime = mockRuntimeModule(Tag, value);
    const Component = link(
      TextView,
      WithRuntime(Runtime, ({ configure }) => {
        const runtime = configure();
        return { text: runtime.use(Tag) };
      })
    );

    const { getByText } = render(<Component id='test' />);
    expect(getByText(value)).toBeDefined();
  });

  it.todo(
    'should allow configure to create a shared instance of the runtime',
    () => {
      const Runtime = mockRuntimeModule(Tag, value);
      const Component = link(
        TextView,
        WithRuntime(Runtime, ({ configure }) => {
          const runtime = configure(/*{ shared: true }*/);
          return { text: runtime.use(Tag) };
        })
      );

      const { getByText } = render(<Component id='test' />);
      expect(getByText(value)).toBeDefined();
    }
  );
});
