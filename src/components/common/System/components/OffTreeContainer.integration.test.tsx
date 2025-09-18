import * as React from 'react';
import { render } from '@testing-library/react';
import { flushSync } from 'react-dom';
import { OffTreeContainer } from './OffTreeContainer';

describe('OffTreeContainer', () => {
  it('should pass', () => {
    expect(true).toBeTruthy();
  });
  it('should make a dependency available synchronously for any descendents when notified', () => {
    // External store
    const notifier = (() => {
      let listeners = [] as (() => void)[];
      return {
        rerenderAll() {
          listeners.forEach((fn) => fn());
        },
        subscribe(fn: () => void) {
          listeners.push(fn);
          return () => {
            listeners = listeners.filter((l) => l !== fn);
          };
        },
      };
    })();

    let count = 0;

    const Descendent: React.FC = () => {
      queueMicrotask(() => {
        flushSync(() => {
          notifier.rerenderAll();
        });
      });

      return <div>{count}</div>;
    };

    const { getByText } = render(
      <>
        <OffTreeContainer
          renderFn={() => {
            React.useSyncExternalStore(notifier.subscribe, () => {});
            count += 1;
            return null;
          }}
        />
        <Descendent />
      </>
    );

    // After update, value should be synchronously available
    expect(getByText(2)).toBeInTheDocument();
  });
});
