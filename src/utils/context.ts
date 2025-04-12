import * as React from 'react';
import {
  Effect,
  identity,
  pipe,
  type Layer,
  type ManagedRuntime,
} from 'effect';

export const createRuntimeContext = <T>(layer: Layer.Layer<T>) => {
  const context = React.createContext<
    (ManagedRuntime.ManagedRuntime<T, never> & { id: string }) | undefined
  >(undefined);
  return Object.assign(context, { layer });
};

export type RuntimeContext<T> = React.Context<RuntimeInstance<T> | undefined>;

export type RuntimeInstance<R> = ManagedRuntime.ManagedRuntime<R, never> & {
  id: string;
};
export type RuntimeType<T> =
  T extends React.Context<infer U> ? NonNullable<U> : never;

export type GetContextType<T> = T extends RuntimeContext<infer U> ? U : never;

export type Config = {
  componentName: string;
  debug: boolean;
  // factory: <T>(layer: Layer.Layer<T>, id: string) => RuntimeInstance<T>;
  postUnmountTTL: number;
};

export const fromLayer = <A, E, R, TResult = Effect.Effect<A, E, R>>(
  layer: Effect.Effect<A, E, R>,
  cb: (arg: A) => TResult = identity as (arg: A) => TResult
) => pipe(layer, Effect.andThen(cb));
