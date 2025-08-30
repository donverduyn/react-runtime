import { render } from '@testing-library/react';
import { Context } from 'effect';
import { withRuntime } from 'components/withRuntime/withRuntime';
import { withUpstream } from 'components/withUpstream/withUpstream';
import { mockRuntimeModule } from 'tests/utils/mockRuntimeModule';
import { connect } from 'utils/connect';
import { withProviderScope } from './withProviderScope';

class Tag extends Context.Tag('TestTag')<Tag, string>() {}

describe('withProviderScope', () => {
  it('should pass', () => {
    expect(true).toBeTruthy();
  });
  it('should do a dry run and return candidates', () => {
    const Module = mockRuntimeModule(Tag, 'providedValue')(() => Root);
    // Arrange
    const ChildView: React.FC<{ tag: string }> = ({ tag }) => (
      <span>{tag}</span>
    );
    const Child = connect(
      ChildView,
      withUpstream(Module, ({ runtime }) => ({
        tag: runtime.use(Tag),
      }))
    );

    const RootView: React.FC = () => {
      return (
        <div>
          Root
          <Child id='CHILD' />
          <Child />
        </div>
      );
    };

    const Root = connect(RootView, withRuntime(Module));
    const TestComponent = connect(Child, withProviderScope(Root));

    const { getByText, debug } = render(<TestComponent />);
    expect(getByText('providedValue')).toBeDefined();
    debug();
    // Assert
    // expect(result).toEqual();
  });
});
