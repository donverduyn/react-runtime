import * as React from 'react';
import { Effect, identity, Layer, ManagedRuntime, pipe } from 'effect';
import type {
  Config,
  RuntimeContext,
  RuntimeInstance,
} from 'components/common/types';
import { isFunctionalComponent } from './react';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): input is RuntimeContext<T> & { reference: () => React.FC<any> } => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'context' in input &&
    'reference' in input &&
    isRuntimeContext((input as { context: RuntimeContext<T> }).context) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (input as { reference: () => React.FC<any> }).reference ===
      'function' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isFunctionalComponent((input.reference as () => React.FC<any>)())
  );
};

export const isRuntimeConfig = (input: unknown): input is Config => {
  return (
    typeof input === 'object' &&
    input !== null &&
    'debug' in input &&
    'postUnmountTTL' in input &&
    'env' in input &&
    'replace' in input &&
    'cleanupPolicy' in input &&
    typeof (input as Config).debug === 'boolean' &&
    typeof (input as Config).postUnmountTTL === 'number' &&
    ['prod', 'dev'].includes((input as Config).env) &&
    typeof (input as Config).replace === 'boolean' &&
    ['onUnmount', 'immediate'].includes((input as Config).cleanupPolicy)
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
  <R = never>() =>
  (layer: Layer.Layer<R>) => {
    const context: RuntimeContext<R> = {
      key: Symbol('RuntimeContext'),
      layer,
    };
    return context;
  };

export const fromLayer = <A, E, R, TResult = Effect.Effect<A, E, R>>(
  layer: Effect.Effect<A, E, R>,
  cb: (arg: A) => TResult = identity as (arg: A) => TResult
) => pipe(layer, Effect.andThen(cb));
