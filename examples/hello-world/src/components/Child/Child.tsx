import {
  withRuntime,
  withUpstream,
  CollectRuntimes,
} from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import * as AppRuntime from '../../App.runtime';
import * as ChildRuntime from './Child.runtime';
import * as Tags from './Child.tags';

type Props = {
  readonly name: string;
};

export const Child = pipe(
  ChildView,
  withUpstream(AppRuntime, ({ runtime }) => {
    console.log('AppRuntime', runtime);
  }),
  withRuntime(ChildRuntime, ({ configure }) => {
    const runtime = configure();
    return { name: runtime.use(Tags.Name) };
  })
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type UniqueRuntimes = CollectRuntimes<typeof Child>;

export function ChildView({ name }: Props) {
  return (
    <div>
      <h1>Hello,{name}!</h1>
    </div>
  );
}
