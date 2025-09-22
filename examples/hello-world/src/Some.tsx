import { WithRuntime, WithUpstream } from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import * as FooRuntime from './Foo.runtime';
import * as SomeRuntime from './Some.runtime';

export const Some = pipe(
  SomeView,
  WithUpstream(FooRuntime, ({ runtime }) => {
    // console.log('FooRuntime', runtime.runtime.id);
  }),
  WithRuntime(SomeRuntime, ({ configure }) => {
    const runtime = configure();
    // console.log('SomeRuntime', runtime.runtime.id);
  })
);

export function SomeView() {
  return <div>Hello world!</div>;
}
