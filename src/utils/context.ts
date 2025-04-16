import * as React from 'react';
import {
  Effect,
  identity,
  pipe,
  type Layer,
  type ManagedRuntime,
} from 'effect';

export type RuntimeContext2<T, R> = {
  context: React.Context<
    | (ManagedRuntime.ManagedRuntime<T, never> & {
        id: string;
      })
    | undefined
  >;
  layer: Layer.Layer<T>;
  reference: R;
};

export const createRuntimeContext2 =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T, R extends { reference: any }>(fn: (layer: Layer.Layer<T>) => R) =>
    (layer: Layer.Layer<T>) => {
      const context = React.createContext<
        (ManagedRuntime.ManagedRuntime<T, never> & { id: string }) | undefined
      >(undefined);
      return {
        context,
        layer,
        ...fn(layer),
      };
    };

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

export const fromLayer = <A, E, R, TResult = Effect.Effect<A, E, R>>(
  layer: Effect.Effect<A, E, R>,
  cb: (arg: A) => TResult = identity as (arg: A) => TResult
) => pipe(layer, Effect.andThen(cb));
