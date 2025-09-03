/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from 'react';
import type { Layer, ManagedRuntime } from 'effect';
import type { MergeLeft } from 'effect/Types';
import type { Booleans, Call, Objects, Tuples } from 'hotscript';
import type { IsStringLiteral, Simplify, Tagged } from 'type-fest';
import type { createUse } from 'hooks/useRuntimeApi/hooks/use';
import type { createFn } from 'hooks/useRuntimeApi/hooks/useFn';
import type { createRun } from 'hooks/useRuntimeApi/hooks/useRun';

export type ScopeId = Tagged<string, 'ScopeId'>;
export type InstId = Tagged<string, 'InstId'>;
export type DeclId = Tagged<string, 'DeclId'>;

export type DeclarationId = Tagged<string, 'DeclarationId'>;
export type ComponentId = Tagged<string, 'ComponentId'>;
export type RegisterId = Tagged<string, 'RegisterId'>;
export type RuntimeKey = symbol;
export type RuntimeId = Tagged<string, 'RuntimeId'>;
export type ProviderId = Tagged<string, 'ProviderId'>;

export type ComponentMeta = {
  name: string;
};

//TODO: this is exported from react utils too
export const ID_PROP = '_id';
export const DRYRUN_ID_PROP = '_dryRunId';

export const PROVIDERS_PROP = '_providers';
export const COMPONENT_PROP = '_component';
export const PROPS_PROP = '_props';
export const UPSTREAM_PROP = '_upstream';
export const ERROR_PROP = '_error';

export type RuntimeApi<R> = {
  instance: RuntimeInstance<R>['runtime'];
  use: ReturnType<typeof createUse<R>>;
  useFn: ReturnType<typeof createFn<R>>;
  useRun: ReturnType<typeof createRun<R>>;
};

export type RuntimeApiFactory<R> = {
  create: (
    module: RuntimeModule<R>,
    instances: Map<RuntimeKey, RuntimeInstance<any>>
  ) => RuntimeApi<R>;
};

export type RuntimeConfig = {
  debug: boolean;
  postUnmountTTL: number;
  env: 'prod' | 'dev'; // Environment config
  replace: boolean; // Freshness config
  cleanupPolicy: 'onUnmount' | 'immediate'; // Disposal strategy
};

export type RuntimeModule<R, C = React.FC<any>> = {
  context: RuntimeContext<R>;
  reference: () => C;
};

export type RuntimeContext<R, E = never, A = never> = {
  key: RuntimeKey;
  layer: Layer.Layer<R, E, A>;
};

export type RuntimePayload<R> = {
  entryId: string;
  index: number;
  context: RuntimeContext<R>;
  config: Partial<RuntimeConfig>;
};

export type RuntimeInstance<R> = {
  runtime: ManagedRuntime.ManagedRuntime<R, never>;
  config: RuntimeConfig;
};

// export type RuntimeInstance
// export type RuntimeType<T> =
//   T extends React.Context<infer U> ? NonNullable<U> : never;

// export type GetContextType<T> = T extends RuntimeContext<infer U> ? U : never;
export type IdProp = { readonly id: string };

export type Extensible<T extends Record<PropertyKey, unknown>> = T &
  Record<PropertyKey, unknown>;

export type IsPrimitiveString<T> = [T] extends [string]
  ? IsStringLiteral<T> extends true
    ? false
    : true
  : false;

export type SafeKeys<T extends PropertyKey> =
  IsPrimitiveString<T> extends false ? T : never;

export type ResultProps<
  CProps,
  ExtraProps extends Record<PropertyKey, unknown>,
> = Readonly<
  Partial<IdProp & Pick<ExtraProps, keyof CProps>> &
    Omit<CProps, SafeKeys<keyof ExtraProps>>
>;

export type ExtensibleProps<CProps> = Extensible<Partial<IdProp & CProps>>;

export type ProviderApi<R> = {
  configure: (config?: Partial<RuntimeConfig>) => RuntimeApi<R>;
  runtime: RuntimeApi<R>;
};

export type ProviderFn<R, CProps, TResult = unknown> = (
  api: ProviderApi<R>,
  props: MergeLeft<IdProp, CProps>
) => TResult;

export type PropsFn<CProps, TResult = unknown> = (
  props: MergeLeft<IdProp, CProps>
) => TResult;

export type ProviderEntryType = 'runtime' | 'upstream' | 'props';
export type ProviderEntry<R, C extends React.FC<any>, P = any> =
  | {
      id: ProviderId;
      type: 'runtime';
      module: RuntimeModule<R>;
      fn?: ProviderFn<R, C, P> | ProviderFn<R, C, undefined> | undefined;
    }
  | {
      id: ProviderId;
      type: 'upstream';
      module: RuntimeModule<R>;
      fn: ProviderFn<R, C, P> | ProviderFn<R, C>;
    }
  | {
      id: ProviderId;
      type: 'props';
      fn: PropsFn<C, P>;
    };

export type ResolvedProviderEntry<
  R,
  C extends React.FC<any>,
  P,
> = ProviderEntry<R, C, P> & {
  level: number;
  index: number;
};

export type ExtractStaticComponent<T> = T extends { [COMPONENT_PROP]: infer C }
  ? C extends (props: infer P) => any
    ? React.FC<Simplify<P>>
    : never
  : T;

export type ExtractStaticProviders<T> = T extends { [PROVIDERS_PROP]: infer R }
  ? R extends unknown[]
    ? R
    : never
  : [];

export type ExtractProviderProps<T> = T extends {
  [PROPS_PROP]: infer P;
}
  ? P
  : Record<never, never>;

export type ExtractProps<C extends React.FC<any>> = React.ComponentProps<C> &
  ExtractProviderProps<C>;

export type ExtractStaticUpstream<T> = T extends { [UPSTREAM_PROP]: infer U }
  ? U extends unknown[]
    ? U
    : never
  : [];

export type ExtractStaticError<T> = T extends { [ERROR_PROP]: infer U }
  ? U extends unknown[]
    ? U
    : never
  : [];

export type UnwrapRuntime<T> = T extends { module: infer R } ? R : T;

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

type ExtractProviders<T> = T extends { [PROVIDERS_PROP]?: infer R } ? R : never;

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

export type CollectProviders<
  Component,
  Seen extends unknown[] = [],
  Acc extends unknown[] = [],
> =
  ExtractProviders<Component> extends readonly [infer Head, ...infer Tail]
    ? ExtractReference<Head> extends infer Ref
      ? Ref extends object
        ? Ref extends Seen[number]
          ? CollectProviders<
              { [PROVIDERS_PROP]?: Tail },
              Seen,
              PushUnique<Acc, Head>
            >
          : CollectProviders<
              { [PROVIDERS_PROP]?: Tail },
              [...Seen, Ref],
              PushUnique<
                [...Acc, ...CollectProviders<Ref, [...Seen, Ref], Acc>],
                Head
              >
            >
        : CollectProviders<
            { [PROVIDERS_PROP]?: Tail },
            Seen,
            PushUnique<Acc, Head>
          >
      : Acc
    : Acc;

export type TraverseDeps<T> = Reverse<Unique<CollectProviders<T>>>;
