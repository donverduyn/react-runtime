// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable vitest/prefer-strict-equal */
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { identity } from 'effect';
import type { IdProp } from 'types';

describe('strict mode/hooks', () => {
  // it('should check if two symbols are equal', () => {
  //   const symbol1 = Symbol('test');
  //   const symbol2 = Symbol('test');
  //   const symbol3 = symbol1;
  //   expect(symbol1 === symbol2).toBe(false);
  //   expect(symbol1 === symbol3).toBe(true);
  //   expect(symbol1).toBe(symbol3);
  //   expect(symbol1).not.toBe(symbol2);
  //   expect(symbol1).toEqual(symbol3);
  //   expect(symbol1).not.toEqual(symbol2);
  // });
  it('should check if useId id changes across unmount/remount cycles', () => {
    const ids: string[] = [];
    function Child() {
      const id = React.useId();
      ids.push(id);
      return <div data-testid='child-id'>{id}</div>;
    }

    function Parent() {
      const [show, setShow] = React.useState(true);
      return (
        <div>
          <button
            // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
            onClick={() => setShow((s) => !s)}
            type='button'
          >
            toggle
          </button>
          {show ? <Child /> : null}
        </div>
      );
    }

    const { getByText, queryByTestId } = render(<Parent />);
    const toggleBtn = getByText('toggle');

    // First mount
    const firstId = queryByTestId('child-id')?.textContent;
    expect(firstId).toBeDefined();

    // Unmount child
    fireEvent.click(toggleBtn);
    expect(queryByTestId('child-id')).toBeNull();

    // Remount child
    fireEvent.click(toggleBtn);
    const secondId = queryByTestId('child-id')?.textContent;
    expect(secondId).toBeDefined();

    // The id from useId should change across unmount/remount cycles
    expect(firstId).not.toBe(secondId);
  });
  it('should match function calls in React.StrictMode', () => {
    const stateInitFn = vi.fn((_: string) => ({}));
    const memoFn = vi.fn((_: string) => ({}));
    const effectFn = vi.fn((_: string) => vi.fn());
    const unmountFn = vi.fn();
    const renderFn = vi.fn();
    // const callbackFn = vi.fn((_: string) => {});

    const StrictTestComponent: React.FC<
      {
        readonly children?: React.ReactNode;
      } & IdProp
    > = ({ id, children }) => {
      renderFn(id);

      // useState
      React.useState(() => stateInitFn(id));

      // useMemo
      React.useMemo(() => memoFn(id), [id]);

      // useCallback
      // React.useCallback(() => callbackFn(id), [id]);

      // useEffect
      React.useEffect(() => {
        effectFn(id);
        return () => {
          unmountFn(id);
        };
      }, [id]);

      return <div>{children}</div>;
    };

    const StrictTestRoot = () => (
      <StrictTestComponent id='root'>
        <StrictTestComponent id='child' />
      </StrictTestComponent>
    );

    render(
      <React.StrictMode>
        <StrictTestRoot />
      </React.StrictMode>
    );

    // In React 18 StrictMode, mount phase functions are called twice (development only)
    // Each component: stateInitFn, memoFn, callbackFn, renderFn, effectFn, unmountFn
    // 2 components: root and child

    // stateInitFn: 2 components * 2 calls each (StrictMode double invoke)

    const stateInitCalls = ['root', 'root', 'child', 'child'];
    expect(stateInitFn.mock.calls.flatMap(identity)).toEqual(stateInitCalls);

    const memoCalls = ['root', 'root', 'child', 'child'];
    expect(memoFn.mock.calls.flatMap(identity)).toEqual(memoCalls);

    // const callbackCalls: [] = [];
    // expect(callbackFn.mock.calls.flatMap(identity)).toEqual(callbackCalls);

    const renderCalls = ['root', 'root', 'child', 'child'];
    expect(renderFn.mock.calls.flatMap(identity)).toEqual(renderCalls);

    const effectCalls = ['child', 'root', 'child', 'root'];
    expect(effectFn.mock.calls.flatMap(identity)).toEqual(effectCalls);

    const unmountCalls = ['root', 'child'];
    expect(unmountFn.mock.calls.flatMap(identity)).toEqual(unmountCalls);
  });

  it('should track ref callback and ref cleanup function call counts in React.StrictMode', () => {
    const refCallback = vi.fn();
    const refCleanup = vi.fn();

    const StrictRefTestComponent: React.FC<{
      readonly id: string;
      readonly children?: React.ReactNode;
    }> = ({ id, children }) => {
      // React 19+ supports returning a cleanup function from ref callback
      const ref = React.useCallback(
        (node: HTMLDivElement | null) => {
          refCallback(id, node);
          if (node) {
            return () => {
              refCleanup(id);
            };
          }
        },
        [id]
      );

      return <div ref={ref}>{children}</div>;
    };

    const StrictRefTestRoot = () => (
      <StrictRefTestComponent id='root'>
        <StrictRefTestComponent id='child' />
      </StrictRefTestComponent>
    );

    render(
      <React.StrictMode>
        <StrictRefTestRoot />
      </React.StrictMode>
    );

    // React 18: refCallback called 4 times per component (mount/unmount double invoke)
    // React 19: refCallback called 2 times per component (mount/unmount single invoke)
    // refCleanup: 1 call per component (on unmount), double in React 18

    expect(refCallback).toHaveBeenCalledTimes(4);
    expect(refCleanup).toHaveBeenCalledTimes(2);
  });
});
