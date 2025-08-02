import * as React from 'react';
import { renderHook, act, render } from '@testing-library/react';
import { withReactId, useStableId, collectReactIds } from './useAncestryId';

describe('withReactId', () => {
  it('injects __reactid prop and processes the JSX tree', () => {
    type Props = {
      __reactid?: string;
    };
    function Tip(props: Props) {
      // console.log('Tip props:', props);
      return <span>tip</span>;
    }
    const TipCmp = withReactId(Tip);
    function Leaf(props: Props) {
      // console.log('Leaf props:', props);
      return (
        <div>
          <span>leaf</span>;
          <TipCmp />
        </div>
      );
    }
    const LeafCmp = withReactId(Leaf);
    function Branch(props: Props) {
      // console.log('Branch props:', props);
      return (
        <div>
          <LeafCmp />
          <LeafCmp />
        </div>
      );
    }
    const BranchCmp = withReactId(Branch);
    function Root() {
      return (
        <div>
          <div>
            <BranchCmp key='1' />
          </div>
          <Leaf />
        </div>
      );
    }

    const Component = withReactId(Root);
    // const { debug } = render(<Component />);
    // debug();

    const node = Component({});
    type TestProps = { __reactid?: string; children?: React.ReactNode };
    const element = React.isValidElement<TestProps>(node) ? node : null;
    const ids = collectReactIds(element);
    // console.log('Collected IDs:', ids);
    // The root div should have __reactid
    expect(element?.props.__reactid).toBeDefined();
    // The children (Leaf) should also have __reactid
    const children = element?.props.children as React.ReactElement[];

    for (const c of children) {
      const el = React.isValidElement<{ __reactid?: string }>(c) ? c : null;
      expect(el?.props.__reactid).toBeDefined();
    }
  });

  it('injects __reactid only for rendered elements when using ternary/null', () => {
    function Leaf() {
      return <span>leaf</span>;
    }
    function TestComponent({ show }: { readonly show: boolean }) {
      return (
        <div>
          {show ? <Leaf /> : null}
          <Leaf />
        </div>
      );
    }

    const Component = withReactId(TestComponent);
    // Case 1: show = false, both children are null
    type TestProps = { __reactid?: string; children?: React.ReactNode };
    const node1 = Component({ show: true });
    const element1 = React.isValidElement<TestProps>(node1) ? node1 : null;
    const ids1 = collectReactIds(element1);
    const node2 = Component({ show: false });
    const element2 = React.isValidElement<TestProps>(node2) ? node2 : null;
    const ids2 = collectReactIds(element2);
    // console.log('ids1:', ids1);
    // console.log('ids2:', ids2);
  });
});

const createHook = <P extends Record<string, unknown>, R>(
  hook: (props: P) => R,
  props: P
) => {
  return renderHook(({ p }) => hook(p), {
    initialProps: { p: props },
  });
};

describe('useStableId', () => {
  it('returns a stable id for the same props', () => {
    const props = { foo: 'bar' };

    const { result, rerender } = createHook(useStableId, props);
    const firstId = result.current;

    rerender({ p: props });
    expect(result.current).toBe(firstId);
  });

  it('returns the same id for different props', () => {
    const props1 = { foo: 'bar' };
    const props2 = { foo: 'baz' };

    const { result, rerender } = createHook(useStableId, props1);
    const firstId = result.current;

    rerender({ p: props2 });
    expect(result.current).toBe(firstId);
  });

  it('restores the id when remounted before the cleanup timeout', async () => {
    const props = { foo: 'bar' };
    const { result, unmount } = createHook(useStableId, props);
    const firstId = result.current;

    vi.useFakeTimers();
    unmount();

    // Simulate waiting for 100ms
    await act(() => vi.advanceTimersByTimeAsync(100));
    const { result: result2 } = createHook(useStableId, props);

    expect(result2.current).toBe(firstId);
    vi.useRealTimers();
  });

  it('generates a new id for with the same props when remounted after 1 second', async () => {
    const props = { foo: 'bar' };
    const { result, unmount } = createHook(useStableId, props);
    const firstId = result.current;

    vi.useFakeTimers();
    unmount();

    // Simulate waiting for 1 second before remounting
    await act(() => vi.advanceTimersByTimeAsync(1000));
    const { result: result3 } = createHook(useStableId, props);

    expect(result3.current).not.toBe(firstId);
    vi.useRealTimers();
  });

  it('returns different ids for different props on first mount', () => {
    const props1 = { foo: 'bar' };
    const props2 = { foo: 'baz' };

    const { result: result1 } = createHook(useStableId, props1);
    const { result: result2 } = createHook(useStableId, props2);

    expect(result1.current).not.toBe(result2.current);
  });

  it('returns a stable id across multiple rerenders with same props', () => {
    const props = { foo: 'bar' };
    const { result, rerender } = createHook(useStableId, props);
    const firstId = result.current;

    rerender({ p: props });
    rerender({ p: props });

    expect(result.current).toBe(firstId);
  });

  it('should clean up the cache array after unmount', () => {
    const props = { foo: 'bar' };
    const { result, unmount } = createHook(useStableId, props);
    const firstId = result.current;
    unmount();

    // Remount with different props to check cache cleanup
    const props2 = { foo: 'baz' };
    const { result: result2 } = createHook(useStableId, props2);

    expect(result2.current).not.toBe(firstId);

    // Remount with original props to check if id is restored or new
    const { result: result3 } = createHook(useStableId, props);

    expect(result3.current).not.toBe(result2.current);
  });

  it('returns unique ids for multiple mounts with different props', () => {
    const propsA = { foo: 'a' };
    const propsB = { foo: 'b' };

    const { result: resultA } = createHook(useStableId, propsA);
    const { result: resultB } = createHook(useStableId, propsB);

    expect(resultA.current).not.toBe(resultB.current);
  });

  it('returns same id for deeply equal props objects', () => {
    const props1 = { foo: 'bar', nested: { a: 1 } };
    const props2 = { foo: 'bar', nested: { a: 1 } };

    const { result, rerender } = createHook(useStableId, props1);
    const firstId = result.current;

    rerender({ p: props2 });
    expect(result.current).toBe(firstId);
  });

  it('returns different ids for props with different keys', () => {
    const props1 = { foo: 'bar' };
    const props2 = { bar: 'foo' };

    const { result: result1 } = createHook(useStableId, props1);
    const { result: result2 } = createHook(useStableId, props2);

    expect(result1.current).not.toBe(result2.current);
  });

  it('returns same id for null and undefined props', () => {
    const { result, rerender } = createHook(
      useStableId,
      null as unknown as Record<string, unknown>
    );
    const firstId = result.current;

    rerender({ p: undefined as unknown as Record<string, unknown> });
    expect(result.current).toBe(firstId);
  });

  it('returns different ids for primitive props', () => {
    const { result: result1 } = createHook(useStableId, { p: 1 as never });
    const { result: result2 } = createHook(useStableId, { p: 2 as never });

    expect(result1.current).not.toBe(result2.current);
  });

  it('restores id if props reference changes but values are the same', () => {
    const props1 = { foo: 'bar' };
    const props2 = { ...props1 };

    const { result, rerender } = createHook(useStableId, props1);
    const firstId = result.current;

    rerender({ p: props2 });
    expect(result.current).toBe(firstId);
  });

  it('restores id for remount with same props', () => {
    const props = { foo: 'bar' };
    const { result, unmount } = createHook(useStableId, props);
    const firstId = result.current;

    unmount();

    const { result: result2 } = createHook(useStableId, props);

    expect(result2.current).toBe(firstId);
  });
});
