import * as React from 'react';
import { render } from '@testing-library/react';
import { Context } from 'effect';
import { withRuntime } from 'components/withRuntime/withRuntime';
import { withUpstream } from 'components/withUpstream/withUpstream';
import { mockRuntimeModule } from 'tests/utils/mockRuntimeModule';
import { link } from 'utils/link';
import { withProviderScope } from './withProviderScope';

class Tag extends Context.Tag('TestTag')<Tag, string>() {}

describe('withProviderScope', () => {
  it('should pass', () => {
    expect(true).toBeTruthy();
  });
  it('should do a dry run and return candidates', () => {
    const tagValue = 'providedValue';
    const RootModule = mockRuntimeModule(Tag, tagValue);
    const RootView: React.FC = () => {
      return (
        <div>
          Root
          <Child />
          <Child id='foo' />
        </div>
      );
    };

    const Root = link(RootView, withRuntime(RootModule));

    const ChildView: React.FC<{ readonly tag: string }> = ({ tag }) => (
      <span>{tag}</span>
    );
    const Child = link(
      ChildView,
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      withUpstream(RootModule, ({ runtime }) => ({
        tag: runtime.use(Tag),
      }))
    );

    // TODO: collect all direct wrapped descendents of the portable root in a separate dry run and immediately prune. This is normally only the root itself, when it is a wrapped component, but if the root is a normal component, it will one or more. in this case we can combine the unresolved modules of all direct descendents and use that to reconstruct at the portable root.

    // TODO: If the collection returns zero wrapped descendents, we can bail out of dry running immediately and, want to show a warning that missing providers couldn't be detected, and that the user should avoid using a non-wrapped portable root, if it's descendents needs dependencies inside suspense.

    // TODO: use ancestry path on frame and when a candidate is picked where multiple share the same props, show a warning like this: "we automatically picked this candate with x props and ancestry path. if you intended to use the candidate at ancestry path y with the same props, tag the rendered component using one of its parent using withParentTag to make it identifiable, or give it a globally unique id"

    // TODO: suggest users to use withParentTag for improving the performance of the dry run matching, by picking the first matched candidate. Still show a log that indicates which ancestry path was used for the matched candidate, so the user can intervein if a descendent has the exact same structure over two levels (very unlikely, but possible, think targeting components inside list items with the same structure).

    // TODO: Only consider using dry run pruning when withParentTag is used, because otherwise, there's not enough information to reliably prune (without the user being informed) and we prefer to show users all other candidates that matched the same component and props with their ancestry path.
    const TestComponent = link(Child, withProviderScope(Root));
    const { getByText, debug } = render(<TestComponent />);
    debug();
    expect(getByText(tagValue)).toBeDefined();
  });
});
