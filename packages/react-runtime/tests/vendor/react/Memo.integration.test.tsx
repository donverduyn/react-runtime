import * as React from 'react';
import { act, render } from '@testing-library/react';

describe('Memo', () => {
  it('should call the second function provided to React.Memo on props change', async () => {
    const Root = () => {
      const [text, setText] = React.useState(() => 'Hello');
      React.useEffect(() => {
        const timeout = setTimeout(() => setText('World'), 100);
        return () => clearTimeout(timeout);
      });
      return <MemoChild text={text} />;
    };

    const previousCalls = vi.fn();
    const nextCalls = vi.fn();

    const MemoChild: React.FC<{ text: string }> = React.memo(
      function MemoComponent(props) {
        return <div>{props.text}</div>;
      },
      (previous, next) => {
        previousCalls(previous);
        nextCalls(next);
        return false;
      }
    );

    vi.useFakeTimers();
    const { getByText } = render(<Root />);
    await act(vi.runAllTimersAsync);

    expect(previousCalls).toHaveBeenCalledWith({ text: 'Hello' });
    expect(nextCalls).toHaveBeenCalledWith({ text: 'World' });
    expect(getByText('World')).toBeDefined();
  });
});
