import * as React from 'react';
import { render } from '@testing-library/react';
import { pipe as connect, Layer, Context } from 'effect';
import { describe, it, expect } from 'vitest';
import { createRuntimeContext } from '../../utils/runtime';
import { withRuntime } from './withRuntime';

class TestTag extends Context.Tag('TestTag')<TestTag, string>() {}

export const TestRuntime = {
  context: connect(Layer.succeed(TestTag, 'test'), createRuntimeContext()),
  reference: () => () => null,
};

describe('withRuntime', () => {
  describe('withRuntime', () => {
    it('should render the wrapped component', () => {
      const DummyComponent = () => <div>Test</div>;
      const Wrapped = withRuntime(TestRuntime)(DummyComponent);

      const { getByText } = render(<Wrapped id='test' />);
      expect(getByText('Test')).toBeDefined();
    });

    it('should pass runtime prop to the wrapped component', () => {
      const DummyComponent = (props: { readonly name: string }) => (
        <div>{props.name}</div>
      );
      const Component = connect(
        DummyComponent,
        withRuntime(TestRuntime, ({ runtime }) => ({
          name: runtime.use(TestTag),
        }))
      );

      const { getByText, debug } = render(<Component id='test' />);
      debug();
      expect(getByText('test')).toBeDefined();
    });

    it('should forward other props to the wrapped component', () => {
      const DummyComponent = (props: { readonly foo: string }) => (
        <div>{props.foo}</div>
      );
      const Wrapped = connect(DummyComponent, withRuntime(TestRuntime));

      const { getByText } = render(
        <Wrapped
          foo='bar'
          id='test'
        />
      );
      expect(getByText('bar')).toBeDefined();
    });

    it('should preserve displayName for debugging', () => {
      const DummyComponent = () => <div />;
      const Wrapped = connect(DummyComponent, withRuntime(TestRuntime));

      expect(Wrapped.displayName).toBe('withRuntime(DummyComponent)');
    });
  });
});
