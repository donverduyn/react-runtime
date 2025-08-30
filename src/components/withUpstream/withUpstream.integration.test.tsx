import * as React from 'react';
import { render } from '@testing-library/react';
import { pipe as connect, Context } from 'effect';
import { describe, it, expect } from 'vitest';
import { withProviderScope } from 'components/withProviderScope/withProviderScope';
import { mockRuntimeModule } from 'tests/utils/mockRuntimeModule';
import { withRuntime } from '../withRuntime/withRuntime';
import { withUpstream } from './withUpstream';

class Tag extends Context.Tag('Tag')<Tag, string>() {}

type ParentProps = {
  readonly children: React.ReactNode;
};

type ChildProps = {
  readonly parentValue: string;
  readonly childValue: string;
};

const ParentView: React.FC<ParentProps> = ({ children }) => (
  <div>{children}</div>
);

const ChildView: React.FC<ChildProps> = (props) => (
  <div>
    <span>{props.parentValue}</span>
    <span>{props.childValue}</span>
  </div>
);

const parentText = 'life is a journey';
const childText = 'death is a destination';

describe('withUpstream', () => {
  it('should pass', () => {
    expect(true).toBeTruthy();
  });
  it('should allow child to resolve parent runtime value', () => {
    const ParentRuntime = mockRuntimeModule(Tag, parentText)(() => Parent);

    const Parent = connect(ParentView, withRuntime(ParentRuntime));
    const Child = connect(
      ChildView,
      withUpstream(ParentRuntime, ({ runtime }) => ({
        parentValue: runtime.use(Tag),
        childValue: childText,
      }))
    );

    const { getByText } = render(
      <Parent id='parent'>
        <Child id='child' />
      </Parent>
    );
    expect(getByText(parentText)).toBeDefined();
  });

  it('should allow child to fallback to parent runtime if its own is not provided', () => {
    const ParentRuntime = mockRuntimeModule(Tag, parentText)(() => Parent);
    const ChildRuntime = mockRuntimeModule(Tag, childText)(() => Child);

    const Parent = connect(ParentView, withRuntime(ParentRuntime));

    const Child = connect(
      ChildView,
      withUpstream(ParentRuntime, ({ runtime }) => ({
        parentValue: runtime.use(Tag),
      })),
      withRuntime(ChildRuntime, ({ runtime }) => ({
        childValue: runtime.use(Tag),
      }))
    );

    const { getByText, debug } = render(
      <Parent id='parent'>
        <Child id='child' />
      </Parent>
    );
    debug();
    expect(getByText(parentText)).toBeDefined();
  });

  it('should allow child to resolve both its own and parent runtime values', () => {
    const ParentRuntime = mockRuntimeModule(Tag, parentText)(() => Parent);
    const ChildRuntime = mockRuntimeModule(Tag, childText)(() => Child);

    const Parent = connect(ParentView, withRuntime(ParentRuntime));

    const Child = connect(
      ChildView,
      withUpstream(ParentRuntime, ({ runtime }) => ({
        parentValue: runtime.use(Tag),
      })),
      withRuntime(ChildRuntime, ({ runtime }) => ({
        childValue: runtime.use(Tag),
      }))
    );

    const { getByText } = render(
      <Parent id='parent'>
        <Child id='child' />
      </Parent>
    );
    expect(getByText(parentText)).toBeDefined();
    expect(getByText(childText)).toBeDefined();
  });

  it.todo('should reconstuct parent runtime in portable scenarios', () => {
    const ParentRuntime = mockRuntimeModule(Tag, parentText)(() => Parent);
    const ChildRuntime = mockRuntimeModule(Tag, childText)(() => Child);

    // TODO: if no candidates are found, we fall back to the provided component to withProviderScope. This also allows picking providers from components that do not render in the same tree or through children.
    const Parent = connect(ParentView, withRuntime(ParentRuntime));

    const Child = connect(
      ChildView,
      withUpstream(ParentRuntime, ({ runtime }) => ({
        parentValue: runtime.use(Tag),
      })),
      withRuntime(ChildRuntime, ({ runtime }) => ({
        childValue: runtime.use(Tag),
      }))
    );

    const Test = connect(Child, withProviderScope(Parent));
    const { getByText } = render(<Test id='child' />);

    expect(getByText(parentText)).toBeDefined();
    expect(getByText(childText)).toBeDefined();
  });
});
