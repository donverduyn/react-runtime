import { Effect, identity, Layer, ManagedRuntime, pipe } from 'effect';
import type {
  RuntimeConfig,
  RuntimeContext,
  RuntimeInstance,
  RuntimeModule,
} from '@/types';

export const link = pipe;

export const isRuntimeContext = <T>(
  input: unknown
): input is RuntimeContext<T> => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'key' in input &&
    'layer' in input &&
    typeof (input as RuntimeContext<T>).key === 'symbol' &&
    typeof (input as RuntimeContext<T>).layer === 'object' &&
    Layer.isLayer(input.layer as Layer.Layer<T>)
  );
};

export const isRuntimeModule = <T>(
  input: unknown
): input is RuntimeModule<T> => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'context' in input &&
    isRuntimeContext(input.context)
  );
};

export const isRuntimeConfig = (input: unknown): input is RuntimeConfig => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'debug' in input &&
    'postUnmountTTL' in input &&
    'env' in input &&
    'replace' in input &&
    'cleanupPolicy' in input &&
    typeof (input as RuntimeConfig).debug === 'boolean' &&
    typeof (input as RuntimeConfig).postUnmountTTL === 'number' &&
    ['prod', 'dev'].includes((input as RuntimeConfig).env) &&
    typeof (input as RuntimeConfig).replace === 'boolean' &&
    ['onUnmount', 'immediate'].includes((input as RuntimeConfig).cleanupPolicy)
  );
};

export const isRuntimeInstance = <T>(
  input: unknown
): input is RuntimeInstance<T> => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'runtime' in input &&
    ManagedRuntime.isManagedRuntime(input.runtime) &&
    'config' in input &&
    typeof (input as RuntimeInstance<T>).config === 'object' &&
    isRuntimeConfig((input as RuntimeInstance<T>).config)
  );
};

export const createRuntimeContext =
  (options: { name: string }) =>
  <R, E, A>(layer: Layer.Layer<R, E, A>) => {
    const context: RuntimeContext<R, E, A> = {
      key: Symbol('RuntimeContext'),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      name: options?.name ?? 'runtime_name',
      layer,
    };
    return context;
  };

export const fromLayer = <A, E, R, TResult = Effect.Effect<A, E, R>>(
  layer: Effect.Effect<A, E, R>,
  cb: (arg: A) => TResult = identity as (arg: A) => TResult
) => pipe(layer, Effect.andThen(cb));
