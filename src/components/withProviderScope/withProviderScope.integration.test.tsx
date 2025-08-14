import { render } from '@testing-library/react';
import { withProps } from 'components/withProps/withProps';
import { connect } from 'utils/connect';
import { withProviderScope } from './withProviderScope';

describe('withRoot', () => {
  it('should pass', () => {
    expect(true).toBeTruthy();
  });
  it('should do a dry run and return candidates', () => {
    // Arrange
    const ChildView: React.FC = () => <span>Child</span>;
    const Child = connect(
      ChildView,
      withProps(() => ({}))
    );

    const RootView: React.FC = () => (
      <div>
        Root
        <Child id='child' />
      </div>
    );

    const Root = connect(
      RootView,
      withProps(() => ({}))
    );

    const TestComponent = connect(
      Child,
      withProviderScope(Root, { id: 'test' })
    );

    const { getByText, debug } = render(<TestComponent id='test' />);
    expect(getByText('Child')).toBeDefined();
    debug();
    // Assert
    // expect(result).toEqual();
  });
});
