import * as React from 'react';
import { render } from '@testing-library/react';
import { pipe, Layer, Context } from 'effect';
import { describe, it, expect } from 'vitest';
import type { RuntimeModule } from 'components/common/types';
import { withProps } from 'components/withProps/withProps';
import { connect, createRuntimeContext } from '../../utils/runtime';
import { withRuntime } from './withRuntime';

class TestTag extends Context.Tag('TestTag')<TestTag, string>() {}

describe('withRuntime', () => {
  it('should render the wrapped component', () => {
    const TestRuntime = {
      context: pipe(Layer.empty, createRuntimeContext()),
      reference: () => TestComponent,
    };
    const TestComponent = connect(
      () => <div>Test</div>,
      withRuntime(TestRuntime)
    );

    const { getByText } = render(<TestComponent id='test' />);
    expect(getByText('Test')).toBeDefined();
  });

  it('should pass runtime prop to the wrapped component', () => {
    const value = 'test';

    const TestRuntime = {
      context: pipe(Layer.succeed(TestTag, value), createRuntimeContext()),
      reference: () => TestComponent,
    };
    const TestComponent = connect(
      (props: { name: string }) => <div>{props.name}</div>,
      withRuntime(TestRuntime, ({ runtime }) => ({
        name: runtime.use(TestTag),
      }))
    );

    const { getByText } = render(<TestComponent id='test' />);
    expect(getByText(value)).toBeDefined();
  });

  it('should forward other props to the wrapped component', () => {
    const TestRuntime = {
      context: pipe(Layer.empty, createRuntimeContext()),
      reference: () => TestComponent,
    };
    const TestComponent = connect(
      (props: { foo: string }) => <div>{props.foo}</div>,
      withRuntime(TestRuntime)
    );

    const { getByText } = render(
      <TestComponent
        foo='bar'
        id='test'
      />
    );
    expect(getByText('bar')).toBeDefined();
  });

  it('should preserve displayName for debugging', () => {
    const TestRuntime = {
      context: pipe(Layer.empty, createRuntimeContext()),
      reference: () => Wrapped,
    };
    const TestView = () => <div />;
    const Wrapped = connect(TestView, withRuntime(TestRuntime));

    expect(Wrapped.displayName).toBe('withRuntime(TestView)');
  });

  it('should make props available from the first hoc to the second', () => {
    const value = 'test';
    const TestRuntime: RuntimeModule<TestTag> = {
      context: pipe(Layer.succeed(TestTag, value), createRuntimeContext()),
      reference: () => TestComponent,
    };
    const TestComponent = connect(
      (props: { name: string }) => <div>{props.name}</div>,
      withRuntime(TestRuntime, ({ runtime }) => ({
        foo: runtime.use(TestTag),
      })),
      withProps((props) => ({
        name: props.foo,
      }))
    );

    const { getByText } = render(<TestComponent id='test' />);
    expect(getByText(value)).toBeDefined();
  });
});
