/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Layer, ManagedRuntime } from 'effect';
import type { Booleans, Call, Objects, Tuples } from 'hotscript';
import type { Merge, Simplify } from 'type-fest';
import type { createUse } from 'hooks/use';
import type { createFn } from 'hooks/useFn';
import type { createRun } from 'hooks/useRun';
import type { RuntimeKey } from 'hooks/useRuntimeProvider/types';

export const RUNTIME_PROP = '_runtimes';
export const COMPONENT_PROP = '_component';
export const PROPS_PROP = '_props';
export const UPSTREAM_PROP = '_upstream';

export type RuntimeApi<R> = {
  instance: RuntimeInstance<R>['runtime'];
  use: ReturnType<typeof createUse<R>>;
  useFn: ReturnType<typeof createFn<R>>;
  useRun: ReturnType<typeof createRun<R>>;
};

export type Config = {
  debug: boolean;
  postUnmountTTL: number;
  env: 'prod' | 'dev'; // Environment config
  replace: boolean; // Freshness config
  cleanupPolicy: 'onUnmount' | 'immediate'; // Disposal strategy
};

export type RuntimeModule<R, C extends React.FC<any> = React.FC<any>> = {
  context: RuntimeContext<R>;
  reference: () => C;
};

export type RuntimeContext<T> = {
  key: RuntimeKey;
  layer: Layer.Layer<T>;
};

export type RuntimePayload<R> = {
  entryId: string;
  context: RuntimeContext<R>;
  config: Partial<Config>;
};

export type RuntimeInstance<R> = {
  runtime: ManagedRuntime.ManagedRuntime<R, never>;
  config: Config;
};

// export type RuntimeInstance
// export type RuntimeType<T> =
//   T extends React.Context<infer U> ? NonNullable<U> : never;

// export type GetContextType<T> = T extends RuntimeContext<infer U> ? U : never;

export type RuntimeConfigFn<
  R,
  C extends React.FC<any>,
  TProps = Record<PropertyKey, any>,
> = (
  api: {
    configure: (config?: Partial<Config>) => RuntimeApi<R>;
    runtime: RuntimeApi<R>;
  },
  props: Merge<Partial<React.ComponentProps<C>>, ExtractStaticProps<C>>
) => TProps | undefined;

export type RuntimeHocEntry<R, C extends React.FC<any>> = {
  id: string;
  type: 'runtime' | 'upstream';
  module: RuntimeModule<R, C>;
  configFn?: RuntimeConfigFn<R, C> | undefined;
};

export type ExtractStaticComponent<T> = T extends { [COMPONENT_PROP]: infer C }
  ? C extends (props: infer P) => any
    ? React.FC<Simplify<P>>
    : never
  : T;

export type ExtractStaticHocEntries<T> = T extends { [RUNTIME_PROP]: infer R }
  ? R extends unknown[]
    ? R
    : never
  : [];

export type ExtractStaticProps<T> = T extends { [PROPS_PROP]: infer P }
  ? P
  : Record<never, never>;

export type ExtractStaticUpstream<T> = T extends { [UPSTREAM_PROP]: infer U }
  ? U extends unknown[]
    ? U
    : never
  : [];

export type UnwrapRuntime<T> = T extends { _runtime: infer R } ? R : T;

type ExtractReference<T> =
  UnwrapRuntime<T> extends { reference: () => infer R } ? R : never;

declare const UpstreamSymbol: unique symbol;

type UpstreamBrand = {
  readonly [UpstreamSymbol]: never;
};

export type Up<T> = T & UpstreamBrand;

export type KeepUpstream<T> = Call<
  Tuples.Filter<Booleans.Extends<{ [UpstreamSymbol]: true }>>,
  T
>;

type DownstreamBrand = {
  readonly [UpstreamSymbol]: false;
};

export type Down<T> = T & DownstreamBrand;

export type FilterReference<T> = Call<Tuples.Map<Objects.Get<'type'>>, T>;

type ExtractRuntimes<T> = T extends { _runtimes?: infer R } ? R : never;

type Includes<T extends readonly unknown[], V> = T extends [
  infer Head,
  ...infer Rest,
]
  ? [V] extends [Head]
    ? true
    : Includes<Rest, V>
  : false;

type PushUnique<T extends readonly unknown[], V> =
  Includes<T, V> extends true ? T : [...T, V];

type Reverse<T> = Call<Tuples.Reverse, T>;

type Unique<T extends any[], Acc extends any[] = []> = T extends [
  infer Head,
  ...infer Tail,
]
  ? Head extends Acc[number]
    ? Unique<Tail, Acc>
    : Unique<Tail, [...Acc, Head]>
  : Acc;

export type CollectRuntimes<
  Component,
  Seen extends unknown[] = [],
  Acc extends unknown[] = [],
> =
  ExtractRuntimes<Component> extends readonly [infer Head, ...infer Tail]
    ? ExtractReference<Head> extends infer Ref
      ? Ref extends object
        ? Ref extends Seen[number]
          ? CollectRuntimes<{ _runtimes?: Tail }, Seen, PushUnique<Acc, Head>>
          : CollectRuntimes<
              { _runtimes?: Tail },
              [...Seen, Ref],
              PushUnique<
                [...Acc, ...CollectRuntimes<Ref, [...Seen, Ref], Acc>],
                Head
              >
            >
        : CollectRuntimes<{ _runtimes?: Tail }, Seen, PushUnique<Acc, Head>>
      : Acc
    : Acc;

export type TraverseDeps<T> = Reverse<Unique<CollectRuntimes<T>>>;
