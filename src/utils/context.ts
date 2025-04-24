import * as React from 'react';
import {
  Effect,
  identity,
  pipe,
  type Layer,
  type ManagedRuntime,
} from 'effect';
import type { Config, RuntimeContext } from 'components/common/types';

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

export const createRuntimeContext =
  <TT extends RuntimeContext<R>, R = never>(config: Partial<Config>) =>
  (layer: Layer.Layer<R>) => {
    const reactCtx = React.createContext<
      | (ManagedRuntime.ManagedRuntime<R, never> & {
          id: string;
          config: Config;
        })
      | undefined
    >(undefined);
    const context: RuntimeContext<R> = Object.assign(reactCtx, {
      layer,
      config,
    });
    return context as TT;
  };

export const fromLayer = <A, E, R, TResult = Effect.Effect<A, E, R>>(
  layer: Effect.Effect<A, E, R>,
  cb: (arg: A) => TResult = identity as (arg: A) => TResult
) => pipe(layer, Effect.andThen(cb));
