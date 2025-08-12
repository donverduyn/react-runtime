// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/restrict-template-expressions */
// cleanup-order.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function useCleanup(name: string, log: string[], logCleanup: string[]) {
  React.useEffect(() => {
    log.push(name);
    return () => {
      logCleanup.push(name);
    };
  }, [name, log]);
}

describe('unmount cleanup order', () => {
  it('runs child effect before parent, and cleanup in reverse, DFS, left-to-right', async () => {
    let events: string[] = [];

    function Leaf({ id }: { readonly id: number }) {
      events.push(`leaf render ${id.toString()}`);
      React.useEffect(() => {
        events.push(`leaf effect ${id.toString()}`);
        return () => {
          events.push(`leaf cleanup ${id.toString()}`);
        };
      }, []);
      return null;
    }

    function Child({
      id,
      children,
    }: {
      readonly id: number;
      children?: React.ReactNode;
    }) {
      events.push(`child render ${id.toString()}`);
      React.useEffect(() => {
        events.push(`child effect ${id.toString()}`);
        return () => {
          events.push(`child cleanup ${id.toString()}`);
        };
      }, []);
      return children;
    }

    function Parent({ children }: { children?: React.ReactNode }) {
      events.push('parent render');
      React.useEffect(() => {
        events.push('parent effect');
        return () => {
          events.push('parent cleanup');
        };
      }, []);
      return children;
    }

    const result = render(
      <Parent>
        <Child id={1}>
          <Leaf id={1} />
        </Child>
        <Child id={2}>
          <Leaf id={2} />
        </Child>
      </Parent>
    );
    // Wait for effects to run
    await Promise.resolve();

    expect(events).toEqual([
      // first parent
      'parent render',
      'parent render',
      // first child
      'child render 1',
      'child render 1',
      // first leaf
      'leaf render 1',
      'leaf render 1',
      // second child
      'child render 2',
      'child render 2',
      // first leaf of second child
      'leaf render 2',
      'leaf render 2',

      // up from first leaf
      'leaf effect 1',
      'child effect 1',
      // up from second leaf
      'leaf effect 2',
      'child effect 2',
      // back to parent
      'parent effect',

      // clean up in render order
      'parent cleanup',
      'child cleanup 1',
      'leaf cleanup 1',
      'child cleanup 2',
      'leaf cleanup 2',

      // effects in the effect order again
      'leaf effect 1',
      'child effect 1',
      'leaf effect 2',
      'child effect 2',
      'parent effect',
    ]);

    events = [];
    result.unmount();

    expect(events).toEqual([
      'parent cleanup',
      'child cleanup 1',
      'leaf cleanup 1',
      'child cleanup 2',
      'leaf cleanup 2',
    ]);
  });
  it('visualizes counter for root, parents, children, and leaves', () => {
    let counter = 0;
    const log: string[] = [];

    function Leaf({ label }: { readonly label: string }) {
      const id = ++counter;
      React.useEffect(() => {
        log.push(`Leaf ${label} effect: ${id}`);
        return () => {
          log.push(`Leaf ${label} cleanup: ${id}`);
        };
      }, []);
      log.push(`Leaf ${label}: ${id}`);
      return null;
    }

    function Child({ label }: { readonly label: string }) {
      const id = ++counter;
      React.useEffect(() => {
        log.push(`Child ${label} effect: ${id}`);
        return () => {
          log.push(`Child ${label} cleanup: ${id}`);
        };
      }, []);
      log.push(`Child ${label}: ${id}`);
      return (
        <>
          <Leaf label={`${label}-L1`} />
          <Leaf label={`${label}-L2`} />
          <Leaf label={`${label}-L3`} />
        </>
      );
    }

    function Parent({ label }: { readonly label: string }) {
      const id = ++counter;
      React.useEffect(() => {
        log.push(`Parent ${label} effect: ${id}`);
        return () => {
          log.push(`Parent ${label} cleanup: ${id}`);
        };
      }, []);
      log.push(`Parent ${label}: ${id}`);
      return (
        <>
          <Child label={`${label}-C1`} />
          <Child label={`${label}-C2`} />
          <Child label={`${label}-C3`} />
        </>
      );
    }

    function Root() {
      const id = ++counter;
      log.push(`Root: ${id}`);
      return (
        <>
          <Parent label='P1' />
          <Parent label='P2' />
          <Parent label='P3' />
        </>
      );
    }

    render(<Root />);
    // You can inspect the log to see the mounting order and counter values
    // For demonstration, let's print the log
    // console.log(log);

    // Example assertion: check the number of log entries
    // expect(log).toHaveLength(1 + 3 + 9 + 27); // 1 root + 3 parents + 9 children + 27 leaves
    expect(log).toEqual([
      'Root: 1',
      'Root: 2',
      'Parent P1: 3',
      'Parent P1: 4',
      'Child P1-C1: 5',
      'Child P1-C1: 6',
      'Leaf P1-C1-L1: 7',
      'Leaf P1-C1-L1: 8',
      'Leaf P1-C1-L2: 9',
      'Leaf P1-C1-L2: 10',
      'Leaf P1-C1-L3: 11',
      'Leaf P1-C1-L3: 12',
      'Child P1-C2: 13',
      'Child P1-C2: 14',
      'Leaf P1-C2-L1: 15',
      'Leaf P1-C2-L1: 16',
      'Leaf P1-C2-L2: 17',
      'Leaf P1-C2-L2: 18',
      'Leaf P1-C2-L3: 19',
      'Leaf P1-C2-L3: 20',
      'Child P1-C3: 21',
      'Child P1-C3: 22',
      'Leaf P1-C3-L1: 23',
      'Leaf P1-C3-L1: 24',
      'Leaf P1-C3-L2: 25',
      'Leaf P1-C3-L2: 26',
      'Leaf P1-C3-L3: 27',
      'Leaf P1-C3-L3: 28',
      'Parent P2: 29',
      'Parent P2: 30',
      'Child P2-C1: 31',
      'Child P2-C1: 32',
      'Leaf P2-C1-L1: 33',
      'Leaf P2-C1-L1: 34',
      'Leaf P2-C1-L2: 35',
      'Leaf P2-C1-L2: 36',
      'Leaf P2-C1-L3: 37',
      'Leaf P2-C1-L3: 38',
      'Child P2-C2: 39',
      'Child P2-C2: 40',
      'Leaf P2-C2-L1: 41',
      'Leaf P2-C2-L1: 42',
      'Leaf P2-C2-L2: 43',
      'Leaf P2-C2-L2: 44',
      'Leaf P2-C2-L3: 45',
      'Leaf P2-C2-L3: 46',
      'Child P2-C3: 47',
      'Child P2-C3: 48',
      'Leaf P2-C3-L1: 49',
      'Leaf P2-C3-L1: 50',
      'Leaf P2-C3-L2: 51',
      'Leaf P2-C3-L2: 52',
      'Leaf P2-C3-L3: 53',
      'Leaf P2-C3-L3: 54',
      'Parent P3: 55',
      'Parent P3: 56',
      'Child P3-C1: 57',
      'Child P3-C1: 58',
      'Leaf P3-C1-L1: 59',
      'Leaf P3-C1-L1: 60',
      'Leaf P3-C1-L2: 61',
      'Leaf P3-C1-L2: 62',
      'Leaf P3-C1-L3: 63',
      'Leaf P3-C1-L3: 64',
      'Child P3-C2: 65',
      'Child P3-C2: 66',
      'Leaf P3-C2-L1: 67',
      'Leaf P3-C2-L1: 68',
      'Leaf P3-C2-L2: 69',
      'Leaf P3-C2-L2: 70',
      'Leaf P3-C2-L3: 71',
      'Leaf P3-C2-L3: 72',
      'Child P3-C3: 73',
      'Child P3-C3: 74',
      'Leaf P3-C3-L1: 75',
      'Leaf P3-C3-L1: 76',
      'Leaf P3-C3-L2: 77',
      'Leaf P3-C3-L2: 78',
      'Leaf P3-C3-L3: 79',
      'Leaf P3-C3-L3: 80',

      'Leaf P1-C1-L1 effect: 8',
      'Leaf P1-C1-L2 effect: 10',
      'Leaf P1-C1-L3 effect: 12',
      'Child P1-C1 effect: 6',
      'Leaf P1-C2-L1 effect: 16',
      'Leaf P1-C2-L2 effect: 18',
      'Leaf P1-C2-L3 effect: 20',
      'Child P1-C2 effect: 14',
      'Leaf P1-C3-L1 effect: 24',
      'Leaf P1-C3-L2 effect: 26',
      'Leaf P1-C3-L3 effect: 28',
      'Child P1-C3 effect: 22',
      'Parent P1 effect: 4',
      'Leaf P2-C1-L1 effect: 34',
      'Leaf P2-C1-L2 effect: 36',
      'Leaf P2-C1-L3 effect: 38',
      'Child P2-C1 effect: 32',
      'Leaf P2-C2-L1 effect: 42',
      'Leaf P2-C2-L2 effect: 44',
      'Leaf P2-C2-L3 effect: 46',
      'Child P2-C2 effect: 40',
      'Leaf P2-C3-L1 effect: 50',
      'Leaf P2-C3-L2 effect: 52',
      'Leaf P2-C3-L3 effect: 54',
      'Child P2-C3 effect: 48',
      'Parent P2 effect: 30',
      'Leaf P3-C1-L1 effect: 60',
      'Leaf P3-C1-L2 effect: 62',
      'Leaf P3-C1-L3 effect: 64',
      'Child P3-C1 effect: 58',
      'Leaf P3-C2-L1 effect: 68',
      'Leaf P3-C2-L2 effect: 70',
      'Leaf P3-C2-L3 effect: 72',
      'Child P3-C2 effect: 66',
      'Leaf P3-C3-L1 effect: 76',
      'Leaf P3-C3-L2 effect: 78',
      'Leaf P3-C3-L3 effect: 80',
      'Child P3-C3 effect: 74',
      'Parent P3 effect: 56',

      'Parent P1 cleanup: 4',
      'Child P1-C1 cleanup: 6',
      'Leaf P1-C1-L1 cleanup: 8',
      'Leaf P1-C1-L2 cleanup: 10',
      'Leaf P1-C1-L3 cleanup: 12',
      'Child P1-C2 cleanup: 14',
      'Leaf P1-C2-L1 cleanup: 16',
      'Leaf P1-C2-L2 cleanup: 18',
      'Leaf P1-C2-L3 cleanup: 20',
      'Child P1-C3 cleanup: 22',
      'Leaf P1-C3-L1 cleanup: 24',
      'Leaf P1-C3-L2 cleanup: 26',
      'Leaf P1-C3-L3 cleanup: 28',
      'Parent P2 cleanup: 30',
      'Child P2-C1 cleanup: 32',
      'Leaf P2-C1-L1 cleanup: 34',
      'Leaf P2-C1-L2 cleanup: 36',
      'Leaf P2-C1-L3 cleanup: 38',
      'Child P2-C2 cleanup: 40',
      'Leaf P2-C2-L1 cleanup: 42',
      'Leaf P2-C2-L2 cleanup: 44',
      'Leaf P2-C2-L3 cleanup: 46',
      'Child P2-C3 cleanup: 48',
      'Leaf P2-C3-L1 cleanup: 50',
      'Leaf P2-C3-L2 cleanup: 52',
      'Leaf P2-C3-L3 cleanup: 54',
      'Parent P3 cleanup: 56',
      'Child P3-C1 cleanup: 58',
      'Leaf P3-C1-L1 cleanup: 60',
      'Leaf P3-C1-L2 cleanup: 62',
      'Leaf P3-C1-L3 cleanup: 64',
      'Child P3-C2 cleanup: 66',
      'Leaf P3-C2-L1 cleanup: 68',
      'Leaf P3-C2-L2 cleanup: 70',
      'Leaf P3-C2-L3 cleanup: 72',
      'Child P3-C3 cleanup: 74',
      'Leaf P3-C3-L1 cleanup: 76',
      'Leaf P3-C3-L2 cleanup: 78',
      'Leaf P3-C3-L3 cleanup: 80',

      'Leaf P1-C1-L1 effect: 8',
      'Leaf P1-C1-L2 effect: 10',
      'Leaf P1-C1-L3 effect: 12',
      'Child P1-C1 effect: 6',
      'Leaf P1-C2-L1 effect: 16',
      'Leaf P1-C2-L2 effect: 18',
      'Leaf P1-C2-L3 effect: 20',
      'Child P1-C2 effect: 14',
      'Leaf P1-C3-L1 effect: 24',
      'Leaf P1-C3-L2 effect: 26',
      'Leaf P1-C3-L3 effect: 28',
      'Child P1-C3 effect: 22',
      'Parent P1 effect: 4',
      'Leaf P2-C1-L1 effect: 34',
      'Leaf P2-C1-L2 effect: 36',
      'Leaf P2-C1-L3 effect: 38',
      'Child P2-C1 effect: 32',
      'Leaf P2-C2-L1 effect: 42',
      'Leaf P2-C2-L2 effect: 44',
      'Leaf P2-C2-L3 effect: 46',
      'Child P2-C2 effect: 40',
      'Leaf P2-C3-L1 effect: 50',
      'Leaf P2-C3-L2 effect: 52',
      'Leaf P2-C3-L3 effect: 54',
      'Child P2-C3 effect: 48',
      'Parent P2 effect: 30',
      'Leaf P3-C1-L1 effect: 60',
      'Leaf P3-C1-L2 effect: 62',
      'Leaf P3-C1-L3 effect: 64',
      'Child P3-C1 effect: 58',
      'Leaf P3-C2-L1 effect: 68',
      'Leaf P3-C2-L2 effect: 70',
      'Leaf P3-C2-L3 effect: 72',
      'Child P3-C2 effect: 66',
      'Leaf P3-C3-L1 effect: 76',
      'Leaf P3-C3-L2 effect: 78',
      'Leaf P3-C3-L3 effect: 80',
      'Child P3-C3 effect: 74',
      'Parent P3 effect: 56',
    ]);
  });
});
