import { withRuntime, withUpstream } from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import * as ChildRuntime from './Child.runtime';
import * as AppRuntime from '../../App.runtime';
import * as Tags from './Child.tags';

type Props = {
  readonly name: string;
};

export const Child = pipe(
  ChildView,

  withUpstream(AppRuntime, ({ runtime }) => {
    // console.log(runtime.runtime.id);
    return { foo: true };
  }),
  withRuntime(ChildRuntime, ({ configure }) => {
    const runtime = configure({ debug: true });
    return { name: runtime.use(Tags.Name) };
  }),
  withRuntime(ChildRuntime, ({ configure }) => {
    const runtime = configure({
      debug: true,
      fresh: true,
      disposeStrategy: 'dispose',
    });
    return { name: runtime.use(Tags.Name) };
  })
);

function ChildView({ name }: Props) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
    </div>
  );
}
