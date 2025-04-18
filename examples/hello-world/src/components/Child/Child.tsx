import { withRuntime, withUpstream } from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import * as AppRuntime from '../../App.runtime';
import * as ChildRuntime from './Child.runtime';
import * as Tags from './Child.tags';

type Props = {
  readonly name: string;
};

export const Child = pipe(
  ({ name }: Props) => <h1>Hello, {name}!</h1>,

  withUpstream(AppRuntime, ({ runtime }) => {
    console.log(runtime.runtime.id);
    return { foo: true };
  }),
  withRuntime(ChildRuntime, ({ runtime }) => {
    return { name: runtime.use(Tags.Name) };
  })
);

export const ChildView: React.FC<Props> = ({ name }) => {
  return (
    <div>
      <h1>Hello, {name}!</h1>
    </div>
  );
};
