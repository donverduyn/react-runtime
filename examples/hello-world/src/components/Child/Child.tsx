import { withRuntime } from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import { context as ChildRuntime } from './Child.runtime';
import * as Tags from './Child.tags';

type Props = {
  readonly name: string;
};

export const Child = pipe(
  ChildView,
  withRuntime(ChildRuntime, (configure) => {
    const runtime = configure();
    return { name: runtime.use(Tags.Name) };
  })
);

export function ChildView({ name }: Props) {
  return (
    <div>
      <h1>Hello,{name}!</h1>
    </div>
  );
}
