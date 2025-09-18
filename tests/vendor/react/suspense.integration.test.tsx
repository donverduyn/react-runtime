import * as React from 'react';
import { act } from 'react';
import { render } from '@testing-library/react';

describe('suspense', () => {
  it('should promote after a finished render', async () => {
    const text = 'Hello World';
    let promoted = false;
    let gcd = false;

    const Test: React.FC = () => {
      queueMicrotask(() => {
        if (!promoted) {
          gcd = true;
        }
      });

      React.useLayoutEffect(() => {
        promoted = true;
      }, []);
      return <div>{text}</div>;
    };

    const { getByText } = render(<Test />);
    await Promise.resolve();

    expect(gcd).toBeFalsy();
    expect(getByText(text)).toBeTruthy();
  });

  it('should not promote after an aborted render', async () => {
    const text = 'Hello World';
    let suspended = true;
    let promoted = false;
    let gcd = false;

    const Test: React.FC = () => {
      gcd = false;
      queueMicrotask(() => {
        if (!promoted) {
          gcd = true;
        }
      });

      //* note that the position doesn't matter!
      React.useLayoutEffect(() => {
        promoted = true;
      }, []);

      // Simulate Suspense aborting the first render
      if (suspended) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
            suspended = false;
          }, 0);
        });
      }

      return <div>{text}</div>;
    };

    vi.useFakeTimers();
    const { getByText } = render(<Test />);
    await Promise.resolve(); // let any microtasks run

    expect(gcd).toBeTruthy();
    // eslint-disable-next-line vitest/require-to-throw-message
    expect(() => getByText(text)).toThrow();

    await act(vi.runAllTimersAsync);
    expect(gcd).toBeFalsy();
    expect(getByText(text)).toBeTruthy();
  });
});
