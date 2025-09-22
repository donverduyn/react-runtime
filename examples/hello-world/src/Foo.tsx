import { WithRuntime } from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import * as FooRuntime from './Foo.runtime';

export const Foo = pipe(
  FooView,
  WithRuntime(FooRuntime, ({ configure }) => {
    const runtime = configure();
    // console.log('FooRuntime', runtime.runtime.id);
  })
);

export function FooView() {
  return <div>Hello world!</div>;
}
