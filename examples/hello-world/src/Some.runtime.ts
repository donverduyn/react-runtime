import {
  createRuntimeContext,
  pipe,
  Layer,
  Console,
} from '@donverduyn/react-runtime';
import { Some } from './Some';

export const reference = () => Some;

const liveLayer = Layer.scopedDiscard(Console.log('Hello world!'));
// type SomeRuntime = RuntimeContext<Layer.Layer.Context<typeof liveLayer>>;

export const context = pipe(
  liveLayer,
  createRuntimeContext({ name: 'SomeRuntime' })
);
