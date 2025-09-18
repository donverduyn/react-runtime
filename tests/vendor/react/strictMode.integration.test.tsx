// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable vitest/prefer-strict-equal */
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { identity } from 'effect';
import type { IdProp } from '@/types';

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
  it('should reuse the idRef across renders', () => {
    const ids: number[] = [];
    let count = 0;

    function TestComponent() {
      const id = ++count;
      const idRef = React.useRef(id);
      ids.push(id);
      ids.push(idRef.current);

      return <div>Test</div>;
    }

    render(<TestComponent />);

    // idRef keeps the value from the first render
    expect(ids).toEqual([1, 1, 2, 1]);
  });
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
          <button onClick={() => setShow((s) => !s)} type='button'>
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
      const instId = id || 'default';
      renderFn(instId);

      // useState
      React.useState(() => stateInitFn(instId));

      // useMemo
      React.useMemo(() => memoFn(instId), [instId]);

      // useCallback
      // React.useCallback(() => callbackFn(instId), [instId]);

      // useEffect
      React.useEffect(() => {
        effectFn(instId);
        return () => {
          unmountFn(instId);
        };
      }, [instId]);

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
  it('should determine if microtask runs before or after second render in StrictMode', async () => {
    const events: string[] = [];
    let renderCount = 0;

    const TestComponent: React.FC = () => {
      renderCount++;
      const currentRender = renderCount.toString();
      events.push(`render ${currentRender}`);

      queueMicrotask(() => {
        events.push(`microtask after render ${currentRender}`);
      });

      React.useLayoutEffect(() => {
        events.push(`layoutEffect after render ${currentRender}`);
        return () => {
          events.push(`layoutEffect cleanup after render ${currentRender}`);
        };
      });

      React.useEffect(() => {
        events.push(`effect after render ${currentRender}`);
        return () => {
          events.push(`effect cleanup after render ${currentRender}`);
        };
      });

      return <div>test</div>;
    };

    render(<TestComponent />);
    await Promise.resolve();

    expect(events).toEqual([
      'render 1',
      'render 2',
      'layoutEffect after render 2',
      'effect after render 2',
      'layoutEffect cleanup after render 2',
      'effect cleanup after render 2',
      'layoutEffect after render 2',
      'effect after render 2',
      'microtask after render 1',
      'microtask after render 2',
    ]);
  });

  it('microtask runs after effects under act, and committed survives GC', async () => {
    // Tiny in-test registry ------------------------------------------
    type Entry =
      | { status: 'provisional'; token: number }
      | { status: 'committed' };
    let seq = 0;
    const map = new Map<string, Entry>();

    const provisionalSet = (key: string) => {
      const token = ++seq;
      map.set(key, { status: 'provisional', token });
      return token;
    };
    const promote = (key: string) => {
      const e = map.get(key);
      if (!e) return;
      map.set(key, { status: 'committed' });
    };
    const gcIfStillProvisional = (key: string, token: number) => {
      const e = map.get(key);
      if (e && e.status === 'provisional' && e.token === token) {
        map.delete(key);
        return 'deleted';
      }
      return 'kept';
    };
    const has = (key: string) => map.has(key);
    // ---------------------------------------------------------------
    const key = 'k';
    const events: string[] = [];
    let renders = 0;

    const Test: React.FC = () => {
      const c = React.useRef(0);
      c.current = ++renders;
      const n = c.current.toString();
      events.push(`render ${n}`);

      const token = provisionalSet(key);
      queueMicrotask(() => {
        const res = gcIfStillProvisional(key, token);
        events.push(`microtask ${res} after render ${n}`);
      });

      React.useLayoutEffect(() => {
        events.push(`layout ${n}`);
        promote(key); // commit before microtask
        return () => {
          events.push(`layout cleanup ${n}`);
        };
      }, [n]);

      React.useEffect(() => {
        events.push(`effect ${n}`);
        return () => {
          events.push(`effect cleanup ${n}`);
        };
      }, [n]);

      return null;
    };

    render(<Test />);

    // After act: layout+effects have run for the second (Strict) pass.
    expect(has(key)).toBeTruthy(); // promoted

    // Now let the microtask queue drain.
    await Promise.resolve();

    // Still committed; GC was a no-op.
    expect(has(key)).toBeTruthy();
    expect(events).toEqual([
      'render 1',
      'render 2',
      'layout 2',
      'effect 2',
      'layout cleanup 2',
      'effect cleanup 2',
      'layout 2',
      'effect 2',
      'microtask kept after render 1',
      'microtask kept after render 2',
    ]);
  });
  it('should call the render function twice on rerender', () => {
    const renderFn = vi.fn();

    const TestComponent: React.FC = () => {
      renderFn();
      return <div>Test</div>;
    };

    const { rerender } = render(<TestComponent />);
    expect(renderFn).toHaveBeenCalledTimes(2);

    rerender(<TestComponent />);
    expect(renderFn).toHaveBeenCalledTimes(4);
  });

  it('should log timing for effects and cleanups', async () => {
    const logs: string[] = [];
    const snapshots: string[][] = [];

    function log(label: string) {
      logs.push(label);
      queueMicrotask(
        ((logs2: string[]) => () => {
          // Take a snapshot after each log
          snapshots.push([...logs2]);
        })([...logs])
      );
      logs.length = 0; // Clear for next tick
    }

    function TestComponent() {
      React.useLayoutEffect(() => {
        log('layoutEffect');
        return () => log('layoutEffect cleanup');
      }, []);

      React.useEffect(() => {
        log('effect');
        return () => log('effect cleanup');
      }, []);

      return <div>Test</div>;
    }

    // In your test:
    render(<TestComponent />);
    // Wait for microtasks to flush
    await Promise.resolve();

    console.log(snapshots);
  });

  it('should run layoutEffect only once', () => {
    const layoutEffectFn = vi.fn();

    const TestComponent = () => {
      const disposed = React.useRef(false);

      React.useLayoutEffect(() => {
        if (!disposed.current) {
          layoutEffectFn();
        } else {
          disposed.current = false;
        }
        return () => {
          disposed.current = true;
        };
      }, []);

      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(layoutEffectFn).toHaveBeenCalledTimes(1);
  });

  it('should render the parent twice, before rendering the child twice', () => {
    const renderFn = vi.fn();

    const Child: React.FC = () => {
      renderFn('child');
      React.useLayoutEffect(() => {
        renderFn('child layoutEffect');
        return () => {
          renderFn('child layoutEffect cleanup');
        };
      });
      React.useEffect(() => {
        renderFn('child effect');
        return () => {
          renderFn('child effect cleanup');
        };
      });
      return <div>Child</div>;
    };

    const Parent: React.FC = () => {
      renderFn('parent');
      React.useLayoutEffect(() => {
        renderFn('parent layoutEffect');
        return () => {
          renderFn('parent layoutEffect cleanup');
        };
      });
      React.useEffect(() => {
        renderFn('parent effect');
        return () => {
          renderFn('parent effect cleanup');
        };
      });
      return (
        <div>
          <Child />
        </div>
      );
    };

    render(<Parent />);

    expect(renderFn).toHaveBeenCalledTimes(16);
    expect(renderFn.mock.calls).toEqual([
      ['parent'],
      ['parent'],
      ['child'],
      ['child'],
      // unmount/remount phase
      // bottom to top
      ['child layoutEffect'],
      ['parent layoutEffect'],
      // second time bottom to top
      ['child effect'],
      ['parent effect'],
      // top to bottom
      ['parent layoutEffect cleanup'],
      ['child layoutEffect cleanup'],
      // seond time top to bottom
      ['parent effect cleanup'],
      ['child effect cleanup'],
      // mount phase
      // bottom to top (pre-commit)
      ['child layoutEffect'],
      ['parent layoutEffect'],
      // second time bottom to top (after commit)
      ['child effect'],
      ['parent effect'],
    ]);
  });

  it('should render the jsx from the second render', () => {
    let renderCount = 0;

    const TestComponent: React.FC = () => {
      renderCount++;
      return <div data-testid='render-count'>{renderCount}</div>;
    };

    renderCount = 0;
    const screen = render(<TestComponent />);
    // The DOM should show the value from the second render
    expect(screen.getByTestId('render-count').textContent).toBe('2');
  });
});
