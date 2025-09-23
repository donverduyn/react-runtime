// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/restrict-template-expressions */
// cleanup-order.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

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

    expect(events).toStrictEqual([
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

    expect(events).toStrictEqual([
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
      React.useLayoutEffect(() => {
        log.push(`Leaf ${label} layouteffect1: ${id}`);
        return () => {
          log.push(`Leaf ${label} layoutcleanup1: ${id}`);
        };
      }, []);
      React.useEffect(() => {
        log.push(`Leaf ${label} effect1: ${id}`);
        return () => {
          log.push(`Leaf ${label} cleanup1: ${id}`);
        };
      }, []);
      React.useEffect(() => {
        log.push(`Leaf ${label} effect2: ${id}`);
        return () => {
          log.push(`Leaf ${label} cleanup2: ${id}`);
        };
      }, []);
      log.push(`Leaf ${label}: ${id}`);
      return null;
    }

    function Child({ label }: { readonly label: string }) {
      const id = ++counter;
      React.useLayoutEffect(() => {
        log.push(`Child ${label} layouteffect1: ${id}`);
        return () => {
          log.push(`Child ${label} layoutcleanup1: ${id}`);
        };
      }, []);
      React.useEffect(() => {
        log.push(`Child ${label} effect1: ${id}`);
        return () => {
          log.push(`Child ${label} cleanup1: ${id}`);
        };
      }, []);
      React.useEffect(() => {
        log.push(`Child ${label} effect2: ${id}`);
        return () => {
          log.push(`Child ${label} cleanup2: ${id}`);
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
      React.useLayoutEffect(() => {
        log.push(`Parent ${label} layouteffect1: ${id}`);
        return () => {
          log.push(`Parent ${label} layoutcleanup1: ${id}`);
        };
      }, []);
      React.useEffect(() => {
        log.push(`Parent ${label} effect1: ${id}`);
        return () => {
          log.push(`Parent ${label} cleanup1: ${id}`);
        };
      }, []);
      React.useEffect(() => {
        log.push(`Parent ${label} effect2: ${id}`);
        return () => {
          log.push(`Parent ${label} cleanup2: ${id}`);
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

    // flushSync(() => {
    render(<Root />);
    // });

    // You can inspect the log to see the mounting order and counter values
    // For demonstration, let's print the log
    // console.log(log);

    // Example assertion: check the number of log entries
    // expect(log).toHaveLength(1 + 3 + 9 + 27); // 1 root + 3 parents + 9 children + 27 leaves
    expect(log).toStrictEqual([
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

      'Leaf P1-C1-L1 layouteffect1: 8',
      'Leaf P1-C1-L2 layouteffect1: 10',
      'Leaf P1-C1-L3 layouteffect1: 12',
      'Child P1-C1 layouteffect1: 6',
      'Leaf P1-C2-L1 layouteffect1: 16',
      'Leaf P1-C2-L2 layouteffect1: 18',
      'Leaf P1-C2-L3 layouteffect1: 20',
      'Child P1-C2 layouteffect1: 14',
      'Leaf P1-C3-L1 layouteffect1: 24',
      'Leaf P1-C3-L2 layouteffect1: 26',
      'Leaf P1-C3-L3 layouteffect1: 28',
      'Child P1-C3 layouteffect1: 22',
      'Parent P1 layouteffect1: 4',
      'Leaf P2-C1-L1 layouteffect1: 34',
      'Leaf P2-C1-L2 layouteffect1: 36',
      'Leaf P2-C1-L3 layouteffect1: 38',
      'Child P2-C1 layouteffect1: 32',
      'Leaf P2-C2-L1 layouteffect1: 42',
      'Leaf P2-C2-L2 layouteffect1: 44',
      'Leaf P2-C2-L3 layouteffect1: 46',
      'Child P2-C2 layouteffect1: 40',
      'Leaf P2-C3-L1 layouteffect1: 50',
      'Leaf P2-C3-L2 layouteffect1: 52',
      'Leaf P2-C3-L3 layouteffect1: 54',
      'Child P2-C3 layouteffect1: 48',
      'Parent P2 layouteffect1: 30',
      'Leaf P3-C1-L1 layouteffect1: 60',
      'Leaf P3-C1-L2 layouteffect1: 62',
      'Leaf P3-C1-L3 layouteffect1: 64',
      'Child P3-C1 layouteffect1: 58',
      'Leaf P3-C2-L1 layouteffect1: 68',
      'Leaf P3-C2-L2 layouteffect1: 70',
      'Leaf P3-C2-L3 layouteffect1: 72',
      'Child P3-C2 layouteffect1: 66',
      'Leaf P3-C3-L1 layouteffect1: 76',
      'Leaf P3-C3-L2 layouteffect1: 78',
      'Leaf P3-C3-L3 layouteffect1: 80',
      'Child P3-C3 layouteffect1: 74',
      'Parent P3 layouteffect1: 56',

      'Leaf P1-C1-L1 effect1: 8',
      'Leaf P1-C1-L1 effect2: 8',
      'Leaf P1-C1-L2 effect1: 10',
      'Leaf P1-C1-L2 effect2: 10',
      'Leaf P1-C1-L3 effect1: 12',
      'Leaf P1-C1-L3 effect2: 12',
      'Child P1-C1 effect1: 6',
      'Child P1-C1 effect2: 6',
      'Leaf P1-C2-L1 effect1: 16',
      'Leaf P1-C2-L1 effect2: 16',
      'Leaf P1-C2-L2 effect1: 18',
      'Leaf P1-C2-L2 effect2: 18',
      'Leaf P1-C2-L3 effect1: 20',
      'Leaf P1-C2-L3 effect2: 20',
      'Child P1-C2 effect1: 14',
      'Child P1-C2 effect2: 14',
      'Leaf P1-C3-L1 effect1: 24',
      'Leaf P1-C3-L1 effect2: 24',
      'Leaf P1-C3-L2 effect1: 26',
      'Leaf P1-C3-L2 effect2: 26',
      'Leaf P1-C3-L3 effect1: 28',
      'Leaf P1-C3-L3 effect2: 28',
      'Child P1-C3 effect1: 22',
      'Child P1-C3 effect2: 22',
      'Parent P1 effect1: 4',
      'Parent P1 effect2: 4',
      'Leaf P2-C1-L1 effect1: 34',
      'Leaf P2-C1-L1 effect2: 34',
      'Leaf P2-C1-L2 effect1: 36',
      'Leaf P2-C1-L2 effect2: 36',
      'Leaf P2-C1-L3 effect1: 38',
      'Leaf P2-C1-L3 effect2: 38',
      'Child P2-C1 effect1: 32',
      'Child P2-C1 effect2: 32',
      'Leaf P2-C2-L1 effect1: 42',
      'Leaf P2-C2-L1 effect2: 42',
      'Leaf P2-C2-L2 effect1: 44',
      'Leaf P2-C2-L2 effect2: 44',
      'Leaf P2-C2-L3 effect1: 46',
      'Leaf P2-C2-L3 effect2: 46',
      'Child P2-C2 effect1: 40',
      'Child P2-C2 effect2: 40',
      'Leaf P2-C3-L1 effect1: 50',
      'Leaf P2-C3-L1 effect2: 50',
      'Leaf P2-C3-L2 effect1: 52',
      'Leaf P2-C3-L2 effect2: 52',
      'Leaf P2-C3-L3 effect1: 54',
      'Leaf P2-C3-L3 effect2: 54',
      'Child P2-C3 effect1: 48',
      'Child P2-C3 effect2: 48',
      'Parent P2 effect1: 30',
      'Parent P2 effect2: 30',
      'Leaf P3-C1-L1 effect1: 60',
      'Leaf P3-C1-L1 effect2: 60',
      'Leaf P3-C1-L2 effect1: 62',
      'Leaf P3-C1-L2 effect2: 62',
      'Leaf P3-C1-L3 effect1: 64',
      'Leaf P3-C1-L3 effect2: 64',
      'Child P3-C1 effect1: 58',
      'Child P3-C1 effect2: 58',
      'Leaf P3-C2-L1 effect1: 68',
      'Leaf P3-C2-L1 effect2: 68',
      'Leaf P3-C2-L2 effect1: 70',
      'Leaf P3-C2-L2 effect2: 70',
      'Leaf P3-C2-L3 effect1: 72',
      'Leaf P3-C2-L3 effect2: 72',
      'Child P3-C2 effect1: 66',
      'Child P3-C2 effect2: 66',
      'Leaf P3-C3-L1 effect1: 76',
      'Leaf P3-C3-L1 effect2: 76',
      'Leaf P3-C3-L2 effect1: 78',
      'Leaf P3-C3-L2 effect2: 78',
      'Leaf P3-C3-L3 effect1: 80',
      'Leaf P3-C3-L3 effect2: 80',
      'Child P3-C3 effect1: 74',
      'Child P3-C3 effect2: 74',
      'Parent P3 effect1: 56',
      'Parent P3 effect2: 56',

      'Parent P1 layoutcleanup1: 4',
      'Child P1-C1 layoutcleanup1: 6',
      'Leaf P1-C1-L1 layoutcleanup1: 8',
      'Leaf P1-C1-L2 layoutcleanup1: 10',
      'Leaf P1-C1-L3 layoutcleanup1: 12',
      'Child P1-C2 layoutcleanup1: 14',
      'Leaf P1-C2-L1 layoutcleanup1: 16',
      'Leaf P1-C2-L2 layoutcleanup1: 18',
      'Leaf P1-C2-L3 layoutcleanup1: 20',
      'Child P1-C3 layoutcleanup1: 22',
      'Leaf P1-C3-L1 layoutcleanup1: 24',
      'Leaf P1-C3-L2 layoutcleanup1: 26',
      'Leaf P1-C3-L3 layoutcleanup1: 28',
      'Parent P2 layoutcleanup1: 30',
      'Child P2-C1 layoutcleanup1: 32',
      'Leaf P2-C1-L1 layoutcleanup1: 34',
      'Leaf P2-C1-L2 layoutcleanup1: 36',
      'Leaf P2-C1-L3 layoutcleanup1: 38',
      'Child P2-C2 layoutcleanup1: 40',
      'Leaf P2-C2-L1 layoutcleanup1: 42',
      'Leaf P2-C2-L2 layoutcleanup1: 44',
      'Leaf P2-C2-L3 layoutcleanup1: 46',
      'Child P2-C3 layoutcleanup1: 48',
      'Leaf P2-C3-L1 layoutcleanup1: 50',
      'Leaf P2-C3-L2 layoutcleanup1: 52',
      'Leaf P2-C3-L3 layoutcleanup1: 54',
      'Parent P3 layoutcleanup1: 56',
      'Child P3-C1 layoutcleanup1: 58',
      'Leaf P3-C1-L1 layoutcleanup1: 60',
      'Leaf P3-C1-L2 layoutcleanup1: 62',
      'Leaf P3-C1-L3 layoutcleanup1: 64',
      'Child P3-C2 layoutcleanup1: 66',
      'Leaf P3-C2-L1 layoutcleanup1: 68',
      'Leaf P3-C2-L2 layoutcleanup1: 70',
      'Leaf P3-C2-L3 layoutcleanup1: 72',
      'Child P3-C3 layoutcleanup1: 74',
      'Leaf P3-C3-L1 layoutcleanup1: 76',
      'Leaf P3-C3-L2 layoutcleanup1: 78',
      'Leaf P3-C3-L3 layoutcleanup1: 80',

      'Parent P1 cleanup1: 4',
      'Parent P1 cleanup2: 4',
      'Child P1-C1 cleanup1: 6',
      'Child P1-C1 cleanup2: 6',
      'Leaf P1-C1-L1 cleanup1: 8',
      'Leaf P1-C1-L1 cleanup2: 8',
      'Leaf P1-C1-L2 cleanup1: 10',
      'Leaf P1-C1-L2 cleanup2: 10',
      'Leaf P1-C1-L3 cleanup1: 12',
      'Leaf P1-C1-L3 cleanup2: 12',
      'Child P1-C2 cleanup1: 14',
      'Child P1-C2 cleanup2: 14',
      'Leaf P1-C2-L1 cleanup1: 16',
      'Leaf P1-C2-L1 cleanup2: 16',
      'Leaf P1-C2-L2 cleanup1: 18',
      'Leaf P1-C2-L2 cleanup2: 18',
      'Leaf P1-C2-L3 cleanup1: 20',
      'Leaf P1-C2-L3 cleanup2: 20',
      'Child P1-C3 cleanup1: 22',
      'Child P1-C3 cleanup2: 22',
      'Leaf P1-C3-L1 cleanup1: 24',
      'Leaf P1-C3-L1 cleanup2: 24',
      'Leaf P1-C3-L2 cleanup1: 26',
      'Leaf P1-C3-L2 cleanup2: 26',
      'Leaf P1-C3-L3 cleanup1: 28',
      'Leaf P1-C3-L3 cleanup2: 28',
      'Parent P2 cleanup1: 30',
      'Parent P2 cleanup2: 30',
      'Child P2-C1 cleanup1: 32',
      'Child P2-C1 cleanup2: 32',
      'Leaf P2-C1-L1 cleanup1: 34',
      'Leaf P2-C1-L1 cleanup2: 34',
      'Leaf P2-C1-L2 cleanup1: 36',
      'Leaf P2-C1-L2 cleanup2: 36',
      'Leaf P2-C1-L3 cleanup1: 38',
      'Leaf P2-C1-L3 cleanup2: 38',
      'Child P2-C2 cleanup1: 40',
      'Child P2-C2 cleanup2: 40',
      'Leaf P2-C2-L1 cleanup1: 42',
      'Leaf P2-C2-L1 cleanup2: 42',
      'Leaf P2-C2-L2 cleanup1: 44',
      'Leaf P2-C2-L2 cleanup2: 44',
      'Leaf P2-C2-L3 cleanup1: 46',
      'Leaf P2-C2-L3 cleanup2: 46',
      'Child P2-C3 cleanup1: 48',
      'Child P2-C3 cleanup2: 48',
      'Leaf P2-C3-L1 cleanup1: 50',
      'Leaf P2-C3-L1 cleanup2: 50',
      'Leaf P2-C3-L2 cleanup1: 52',
      'Leaf P2-C3-L2 cleanup2: 52',
      'Leaf P2-C3-L3 cleanup1: 54',
      'Leaf P2-C3-L3 cleanup2: 54',
      'Parent P3 cleanup1: 56',
      'Parent P3 cleanup2: 56',
      'Child P3-C1 cleanup1: 58',
      'Child P3-C1 cleanup2: 58',
      'Leaf P3-C1-L1 cleanup1: 60',
      'Leaf P3-C1-L1 cleanup2: 60',
      'Leaf P3-C1-L2 cleanup1: 62',
      'Leaf P3-C1-L2 cleanup2: 62',
      'Leaf P3-C1-L3 cleanup1: 64',
      'Leaf P3-C1-L3 cleanup2: 64',
      'Child P3-C2 cleanup1: 66',
      'Child P3-C2 cleanup2: 66',
      'Leaf P3-C2-L1 cleanup1: 68',
      'Leaf P3-C2-L1 cleanup2: 68',
      'Leaf P3-C2-L2 cleanup1: 70',
      'Leaf P3-C2-L2 cleanup2: 70',
      'Leaf P3-C2-L3 cleanup1: 72',
      'Leaf P3-C2-L3 cleanup2: 72',
      'Child P3-C3 cleanup1: 74',
      'Child P3-C3 cleanup2: 74',
      'Leaf P3-C3-L1 cleanup1: 76',
      'Leaf P3-C3-L1 cleanup2: 76',
      'Leaf P3-C3-L2 cleanup1: 78',
      'Leaf P3-C3-L2 cleanup2: 78',
      'Leaf P3-C3-L3 cleanup1: 80',
      'Leaf P3-C3-L3 cleanup2: 80',

      'Leaf P1-C1-L1 layouteffect1: 8',
      'Leaf P1-C1-L2 layouteffect1: 10',
      'Leaf P1-C1-L3 layouteffect1: 12',
      'Child P1-C1 layouteffect1: 6',
      'Leaf P1-C2-L1 layouteffect1: 16',
      'Leaf P1-C2-L2 layouteffect1: 18',
      'Leaf P1-C2-L3 layouteffect1: 20',
      'Child P1-C2 layouteffect1: 14',
      'Leaf P1-C3-L1 layouteffect1: 24',
      'Leaf P1-C3-L2 layouteffect1: 26',
      'Leaf P1-C3-L3 layouteffect1: 28',
      'Child P1-C3 layouteffect1: 22',
      'Parent P1 layouteffect1: 4',
      'Leaf P2-C1-L1 layouteffect1: 34',
      'Leaf P2-C1-L2 layouteffect1: 36',
      'Leaf P2-C1-L3 layouteffect1: 38',
      'Child P2-C1 layouteffect1: 32',
      'Leaf P2-C2-L1 layouteffect1: 42',
      'Leaf P2-C2-L2 layouteffect1: 44',
      'Leaf P2-C2-L3 layouteffect1: 46',
      'Child P2-C2 layouteffect1: 40',
      'Leaf P2-C3-L1 layouteffect1: 50',
      'Leaf P2-C3-L2 layouteffect1: 52',
      'Leaf P2-C3-L3 layouteffect1: 54',
      'Child P2-C3 layouteffect1: 48',
      'Parent P2 layouteffect1: 30',
      'Leaf P3-C1-L1 layouteffect1: 60',
      'Leaf P3-C1-L2 layouteffect1: 62',
      'Leaf P3-C1-L3 layouteffect1: 64',
      'Child P3-C1 layouteffect1: 58',
      'Leaf P3-C2-L1 layouteffect1: 68',
      'Leaf P3-C2-L2 layouteffect1: 70',
      'Leaf P3-C2-L3 layouteffect1: 72',
      'Child P3-C2 layouteffect1: 66',
      'Leaf P3-C3-L1 layouteffect1: 76',
      'Leaf P3-C3-L2 layouteffect1: 78',
      'Leaf P3-C3-L3 layouteffect1: 80',
      'Child P3-C3 layouteffect1: 74',
      'Parent P3 layouteffect1: 56',

      'Leaf P1-C1-L1 effect1: 8',
      'Leaf P1-C1-L1 effect2: 8',
      'Leaf P1-C1-L2 effect1: 10',
      'Leaf P1-C1-L2 effect2: 10',
      'Leaf P1-C1-L3 effect1: 12',
      'Leaf P1-C1-L3 effect2: 12',
      'Child P1-C1 effect1: 6',
      'Child P1-C1 effect2: 6',
      'Leaf P1-C2-L1 effect1: 16',
      'Leaf P1-C2-L1 effect2: 16',
      'Leaf P1-C2-L2 effect1: 18',
      'Leaf P1-C2-L2 effect2: 18',
      'Leaf P1-C2-L3 effect1: 20',
      'Leaf P1-C2-L3 effect2: 20',
      'Child P1-C2 effect1: 14',
      'Child P1-C2 effect2: 14',
      'Leaf P1-C3-L1 effect1: 24',
      'Leaf P1-C3-L1 effect2: 24',
      'Leaf P1-C3-L2 effect1: 26',
      'Leaf P1-C3-L2 effect2: 26',
      'Leaf P1-C3-L3 effect1: 28',
      'Leaf P1-C3-L3 effect2: 28',
      'Child P1-C3 effect1: 22',
      'Child P1-C3 effect2: 22',
      'Parent P1 effect1: 4',
      'Parent P1 effect2: 4',
      'Leaf P2-C1-L1 effect1: 34',
      'Leaf P2-C1-L1 effect2: 34',
      'Leaf P2-C1-L2 effect1: 36',
      'Leaf P2-C1-L2 effect2: 36',
      'Leaf P2-C1-L3 effect1: 38',
      'Leaf P2-C1-L3 effect2: 38',
      'Child P2-C1 effect1: 32',
      'Child P2-C1 effect2: 32',
      'Leaf P2-C2-L1 effect1: 42',
      'Leaf P2-C2-L1 effect2: 42',
      'Leaf P2-C2-L2 effect1: 44',
      'Leaf P2-C2-L2 effect2: 44',
      'Leaf P2-C2-L3 effect1: 46',
      'Leaf P2-C2-L3 effect2: 46',
      'Child P2-C2 effect1: 40',
      'Child P2-C2 effect2: 40',
      'Leaf P2-C3-L1 effect1: 50',
      'Leaf P2-C3-L1 effect2: 50',
      'Leaf P2-C3-L2 effect1: 52',
      'Leaf P2-C3-L2 effect2: 52',
      'Leaf P2-C3-L3 effect1: 54',
      'Leaf P2-C3-L3 effect2: 54',
      'Child P2-C3 effect1: 48',
      'Child P2-C3 effect2: 48',
      'Parent P2 effect1: 30',
      'Parent P2 effect2: 30',
      'Leaf P3-C1-L1 effect1: 60',
      'Leaf P3-C1-L1 effect2: 60',
      'Leaf P3-C1-L2 effect1: 62',
      'Leaf P3-C1-L2 effect2: 62',
      'Leaf P3-C1-L3 effect1: 64',
      'Leaf P3-C1-L3 effect2: 64',
      'Child P3-C1 effect1: 58',
      'Child P3-C1 effect2: 58',
      'Leaf P3-C2-L1 effect1: 68',
      'Leaf P3-C2-L1 effect2: 68',
      'Leaf P3-C2-L2 effect1: 70',
      'Leaf P3-C2-L2 effect2: 70',
      'Leaf P3-C2-L3 effect1: 72',
      'Leaf P3-C2-L3 effect2: 72',
      'Child P3-C2 effect1: 66',
      'Child P3-C2 effect2: 66',
      'Leaf P3-C3-L1 effect1: 76',
      'Leaf P3-C3-L1 effect2: 76',
      'Leaf P3-C3-L2 effect1: 78',
      'Leaf P3-C3-L2 effect2: 78',
      'Leaf P3-C3-L3 effect1: 80',
      'Leaf P3-C3-L3 effect2: 80',
      'Child P3-C3 effect1: 74',
      'Child P3-C3 effect2: 74',
      'Parent P3 effect1: 56',
      'Parent P3 effect2: 56',
    ]);
  });
});
