// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layer, ManagedRuntime, pipe, type Context } from 'effect';
import type { Tag } from 'effect/Context';
import type { SimplifyDeep, Split } from 'type-fest';
import type { RuntimeConfig, RuntimeContext, RuntimeInstance } from '@/types';
import type { PropService } from './effect';

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
  (options: {
    name: string;
    providers?: () => ReturnType<typeof getProviders>;
  }) =>
  <R, E, A>(layer: Layer.Layer<R, E, A>) => {
    const context: RuntimeContext<R, E, A> = {
      key: Symbol('RuntimeContext'),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      name: options?.name ?? 'runtime_name',
      layer,
    };
    return context;
  };

export const getProviders = <P extends Tag<any, any>[]>(
  callback: (
    from: <R>(runtime: RuntimeContext<R, never, PropService>) => {
      provide: <T extends Tag<any, any>>(
        service: T & Context.Tag.Service<T> extends R ? T : R
      ) => T;
    }
  ) => [...P]
) => {
  const map = new Map<string, RuntimeContext<any>>();
  const providers = callback((runtime) => ({
    provide: (service) => {
      map.set((service as Tag<any, any>).key, runtime as never);
      return service as never;
    },
  }));

  const from = {} as SimplifyDeep<NestServices<typeof providers>>;
  for (const service of providers) {
    const segments = stripAt(service.key).split('/');
    let currentNode = from;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i] as keyof typeof from;

      if (i === segments.length - 1) {
        currentNode[segment] = service as never;
      } else {
        if (!currentNode[segment]) currentNode[segment] = {} as never;
        currentNode = currentNode[segment] as never;
      }
    }
  }

  return { map, from };
};

function stripAt(s: string) {
  return s.startsWith('@') ? s.slice(1) : s;
}

type Nest<K extends string[], V> = K extends [
  infer Head extends string,
  ...infer Rest extends string[],
]
  ? { [P in Head]: Nest<Extract<Rest, string[]>, V> }
  : V;

type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? Merge<A[K], B[K]>
      : A[K]
    : K extends keyof B
      ? B[K]
      : never;
};

type StripAt<S extends string> = S extends `@${infer Rest}` ? Rest : S;

export type NestServices<T extends readonly Context.Tag<any, any>[]> =
  T extends [
    infer First extends Context.Tag<any, any>,
    ...infer Rest extends Context.Tag<any, any>[],
  ]
    ? Merge<Nest<Split<StripAt<First['key']>, '/'>, First>, NestServices<Rest>>
    : object;
