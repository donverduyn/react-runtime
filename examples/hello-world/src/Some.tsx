import { withRuntime, withUpstream } from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import * as FooRuntime from './Foo.runtime';
import * as SomeRuntime from './Some.runtime';

export const Some = pipe(
  SomeView,
  withUpstream(FooRuntime, ({ runtime }) => {
    console.log('FooRuntime', runtime);
  }),
  withRuntime(SomeRuntime, ({ configure }) => {
    const runtime = configure();
    console.log('SomeRuntime', runtime);
  })
);

export function SomeView() {
  return <div>Hello world!</div>;
}
