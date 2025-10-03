import {
  getProviders,
  withRuntime,
  withUpstream,
} from '@donverduyn/react-runtime';
import { pipe } from 'effect';
import { AppCounter, AppRuntime } from '../../App.runtime';
import { ChildRuntime, ChildText } from './Child.runtime';

export const providers = getProviders((from) => [
  from(AppRuntime).provide(AppCounter)
]);

export type Props = {
  readonly text: string;
};

export const Child = pipe(
  ChildView,
  withUpstream(({ inject }) => {
    const count = inject(AppRuntime).use(AppCounter);
    return { text: count };
  }),
  withRuntime(ChildRuntime, ({ runtime }) => {
    const text2 = runtime.use(ChildText);
    return { text2 };
  })
);

function ChildView({ text }: Props) {
  return (
    <div>
      <h2>{text}</h2>
    </div>
  );
}
