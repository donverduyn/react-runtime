import * as React from 'react';
import { render } from '@testing-library/react';
import { pipe as link, Context, pipe } from 'effect';
import { describe, it, expect } from 'vitest';
import { WithProviderScope } from 'components/withProviderScope/withProviderScope';
import { mockRuntimeModule } from 'tests/utils/mockRuntimeModule';
import { WithRuntime } from '../withRuntime/withRuntime';
import { WithUpstream } from './withUpstream';

class Tag extends Context.Tag('Tag')<Tag, string>() {}

type ParentProps = {
  readonly children?: React.ReactNode;
};

type ChildProps = {
  readonly parentValue: string;
  readonly childValue: string;
};

const ParentView: React.FC<ParentProps> = ({ children }) => (
  <div>
    <h1>Parent</h1>
    {children}
  </div>
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
    const ParentRuntime = mockRuntimeModule(Tag, parentText);

    const Parent = link(ParentView, WithRuntime(ParentRuntime));
    const Child = link(
      ChildView,
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      WithUpstream(ParentRuntime, ({ runtime }) => ({
        parentValue: runtime.use(Tag),
        childValue: childText,
      }))
    );

    const { getByText } = render(
      <Parent>
        <Child />
      </Parent>
    );
    expect(getByText(parentText)).toBeDefined();
  });

  it('should allow child to fallback to parent runtime if its own is not provided', () => {
    const ParentRuntime = mockRuntimeModule(Tag, parentText);
    const ChildRuntime = mockRuntimeModule(Tag, childText);

    const Parent = link(ParentView, WithRuntime(ParentRuntime));

    const Child = link(
      ChildView,
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      WithUpstream(ParentRuntime, ({ runtime }) => ({
        parentValue: runtime.use(Tag),
      })),
      WithRuntime(ChildRuntime, ({ runtime }) => ({
        childValue: runtime.use(Tag),
      }))
    );

    const { getByText, debug } = render(
      <Parent>
        <Child />
      </Parent>
    );
    debug();
    expect(getByText(parentText)).toBeDefined();
  });

  it('should allow child to resolve both its own and parent runtime values', () => {
    const ParentRuntime = mockRuntimeModule(Tag, parentText);
    const ChildRuntime = mockRuntimeModule(Tag, childText);

    const Parent = link(ParentView, WithRuntime(ParentRuntime));

    const Child = link(
      ChildView,
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      WithUpstream(ParentRuntime, ({ runtime }) => ({
        parentValue: runtime.use(Tag),
      })),
      WithRuntime(ChildRuntime, ({ runtime }) => ({
        childValue: runtime.use(Tag),
      }))
    );

    const { getByText, debug } = render(
      <Parent>
        <Child />
      </Parent>
    );
    debug();
    expect(getByText(parentText)).toBeDefined();
    expect(getByText(childText)).toBeDefined();
  });

  it('should reconstuct parent runtime in portable scenarios', () => {
    const ParentRuntime = mockRuntimeModule(Tag, parentText, 'ParentRuntime');
    const ChildRuntime = mockRuntimeModule(Tag, childText, 'ChildRuntime');

    // TODO: if no candidates are found, we fall back to the provided component to withProviderScope. This also allows picking providers from components that do not render in the same tree or through children.
    const Parent = link(ParentView, WithRuntime(ParentRuntime));

    const Child = link(
      ChildView,
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      WithUpstream(ParentRuntime, ({ runtime }) => ({
        parentValue: runtime.use(Tag),
      })),
      WithRuntime(ChildRuntime, ({ runtime }) => ({
        childValue: runtime.use(Tag),
      }))
    );

    const Test = link(Child, WithProviderScope(Parent, {}));
    const { getByText } = render(<Test />);

    expect(getByText(parentText)).toBeDefined();
    expect(getByText(childText)).toBeDefined();
  });
  it('should support the inject() api', () => {
    const ParentRuntime = mockRuntimeModule(Tag, parentText);
    const Parent = link(ParentView, WithRuntime(ParentRuntime));

    const Child = pipe(
      ChildView,
      WithUpstream(({ inject }) => ({
        parentValue: inject(ParentRuntime).use(Tag),
        childValue: childText,
      }))
    );

    const { getByText, debug } = render(
      <Parent>
        <Child />
      </Parent>
    );
    debug();
    expect(getByText(parentText)).toBeDefined();
    expect(getByText(childText)).toBeDefined();
  });
});
