import * as React from 'react';
import { render } from '@testing-library/react';
import { pipe as connect, Layer, Context } from 'effect';
import { describe, it, expect } from 'vitest';
import type { RuntimeModule } from 'components/common/types';
import { createRuntimeContext } from '../../utils/runtime';
import { withRuntime } from '../withRuntime/withRuntime';
import { withUpstream } from './withUpstream';

class ParentTag extends Context.Tag('ParentTag')<ParentTag, string>() {}
class ChildTag extends Context.Tag('ChildTag')<ChildTag, string>() {}

type ParentProps = {
  children: React.ReactNode;
};

type ChildProps = {
  parentValue: string;
  childValue: string;
};

const ParentRuntime: RuntimeModule<ParentTag> = {
  context: connect(Layer.succeed(ParentTag, 'parent'), createRuntimeContext()),
  reference: () => ParentComponent,
};

const ChildRuntime: RuntimeModule<ChildTag> = {
  context: connect(Layer.succeed(ChildTag, 'child'), createRuntimeContext()),
  reference: () => ChildComponent,
};

const ParentComponent = connect(
  ({ children }: ParentProps) => <div>{children}</div>,
  withRuntime(ParentRuntime)
);

const ChildComponent = connect(
  (props: ChildProps) => (
    <span>
      {props.parentValue}-{props.childValue}
    </span>
  ),
  withUpstream(ParentRuntime, ({ runtime }) => ({
    parentValue: runtime.use(ParentTag),
  })),
  withRuntime(ChildRuntime, ({ runtime }) => ({
    childValue: runtime.use(ChildTag),
  }))
);

describe('withUpstream', () => {
  it('should allow child to resolve parent runtime value', () => {
    const { getByText, debug } = render(
      <ParentComponent id='parent'>
        <ChildComponent id='child' />
      </ParentComponent>
    );
    debug();
    expect(getByText(/parent/)).toBeDefined();
  });

  it('should allow child to use its own runtime if provided', () => {
    const { getByText } = render(
      <ParentComponent id='parent'>
        <ChildComponent id='child' />
      </ParentComponent>
    );
    expect(getByText(/child/)).toBeDefined();
  });

  it('should allow child to fallback to parent runtime if its own is not provided', () => {
    const { getByText } = render(
      <ParentComponent id='parent'>
        <ChildComponent id='child' />
      </ParentComponent>
    );
    expect(getByText(/parent/)).toBeDefined();
  });

  it('should allow child to resolve both its own and parent runtime values', () => {
    const { getByText } = render(
      <ParentComponent id='parent'>
        <ChildComponent id='child' />
      </ParentComponent>
    );
    expect(getByText('parent-child')).toBeDefined();
  });

  it('should reconstuct parent runtime in portable scenarios', () => {
    const { getByText } = render(<ChildComponent id='child' />);

    expect(getByText('parent-child')).toBeDefined();
  });
});
