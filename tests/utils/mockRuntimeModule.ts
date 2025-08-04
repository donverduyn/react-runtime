import type { Context } from 'effect';
import { Layer, pipe } from 'effect';
import type { RuntimeModule } from 'components/common/providerFactory/types';
import { createRuntimeContext } from 'utils/runtime';

export const mockRuntimeModule =
  <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Context.Tag<any, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    C extends React.FC<any>,
  >(
    tag: T,
    value: Context.Tag.Service<T>
  ) =>
  (reference: () => C): RuntimeModule<T['Identifier']> => ({
    context: pipe(Layer.succeed(tag, value), createRuntimeContext()),
    reference,
  });
