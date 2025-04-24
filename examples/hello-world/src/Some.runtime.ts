import { pipe, Layer, Console } from 'effect';
import type { RuntimeContext } from '../../../src/components/common/types';
import { createRuntimeContext } from '../../../src/utils/context';
import { Some } from './Some';

export const reference = () => Some;

const liveLayer = Layer.scopedDiscard(Console.log('Hello world!'));
type SomeRuntime = RuntimeContext<Layer.Layer.Context<typeof liveLayer>>;

export const context = pipe(liveLayer, createRuntimeContext<SomeRuntime>({}));
