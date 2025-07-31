import { pipe, Layer } from 'effect';
import { createRuntimeContext } from '../../utils/runtime';
import type { RuntimeModule } from '../common/types';

// Dummy runtime type for tests
export type TestRuntime = object;

export const TestRuntimeModule: RuntimeModule<TestRuntime> = {
  context: pipe(
    Layer.empty as Layer.Layer<object>,
    createRuntimeContext<TestRuntime>()
  ),
  reference: () => () => null,
};
