import type { Context } from 'effect';
import { Layer, pipe } from 'effect';
import type { RuntimeModule } from '@/types';
import { createRuntimeContext } from 'utils/runtime';

export const mockRuntimeModule = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Context.Tag<any, any>,
>(
  tag: T,
  value: Context.Tag.Service<T>,
  name: string = 'untitled'
): RuntimeModule<T['Identifier']> => ({
  context: pipe(Layer.succeed(tag, value), createRuntimeContext({ name })),
});
