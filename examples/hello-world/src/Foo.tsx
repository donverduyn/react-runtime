import { withRuntime } from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import * as FooRuntime from './Foo.runtime';

export const Foo = pipe(
  FooView,
  withRuntime(FooRuntime, ({ configure }) => {
    const runtime = configure();
    console.log('FooRuntime', runtime);
  })
);

export function FooView() {
  return <div>Hello world!</div>;
}
