import type { Context } from 'effect';
import { Layer, pipe } from 'effect';
import type { RuntimeContext, RuntimeModule } from '@/types';
import { createRuntimeContext } from 'utils/effect/runtime';

export const mockRuntimeModule = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Context.Tag<any, any>,
>(
  tag: T,
  value: Context.Tag.Service<T>,
  name: string = 'untitled'
): RuntimeContext<T['Identifier']> => 
  pipe(Layer.succeed(tag, value), createRuntimeContext({ name }))

