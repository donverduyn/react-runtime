// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Layer } from 'effect';
import type { Simplify, IsAny } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { createUse } from 'hooks/use';
import { createFn } from 'hooks/useFn';
import { createRun } from 'hooks/useRun';
import { useRuntimeInstance } from 'hooks/useRuntimeInstance';
import type { RuntimeInstance, RuntimeContext } from 'utils/context';
import {
  createElement,
  extractMeta,
  getDisplayName,
  copyStaticProperties,
  type ExtractMeta,
} from 'utils/react';

const REGISTRY_PROP = '__runtimes';
const COMPONENT_PROP = '__component';

type Props = {
  readonly children?: React.ReactNode;
};

type RuntimeApi<R> = {
  runtime: RuntimeInstance<R>;
  use: ReturnType<typeof createUse<R>>;
  useFn: ReturnType<typeof createFn<R>>;
  useRun: ReturnType<typeof createRun<R>>;
};

type Config = {
  componentName: string;
  debug: boolean;
  postUnmountTTL: number;
  env: 'prod' | 'dev'; // Environment config
};

type InferProps<C> = C extends React.FC<infer P> ? P : never;
type FallbackProps<C, P> =
  IsAny<InferProps<C>> extends false ? InferProps<C> : P;

type RuntimeConfigFn<
  R,
  C extends React.FC<any>,
  TProps = Record<PropertyKey, any>,
> = (
  factory: (config?: Partial<Config>) => RuntimeApi<R>,
  props: Simplify<Partial<React.ComponentProps<C>>>
) => TProps | undefined;

type RuntimeEntry<R, C extends AnnotatedComponent<any>> = {
  id: string;
  type: 'runtime' | 'upstream';
  context: RuntimeContextReference<R, C>;
  configFn?: RuntimeConfigFn<R, C> | undefined;
};

type RuntimeContextReference<R, C extends React.FC<any> = React.FC<any>> = {
  context: RuntimeContext<R>;
  reference: () => AnnotatedComponent<C>;
};

type ExtractStaticComponent<T> = T extends { [COMPONENT_PROP]?: infer C }
  ? C
  : undefined;

type ExtractStaticRegistry<T> = T extends { [REGISTRY_PROP]?: infer R }
  ? R
  : undefined;

type AnnotatedComponent<C extends React.FC<any>> = React.FC<
  React.ComponentProps<C>
> & {
  [REGISTRY_PROP]?: ExtractStaticRegistry<C>;
  [COMPONENT_PROP]?: ExtractStaticComponent<C>;
};

const getStaticRegistry = <C extends React.FC<any>>(
  component: (C & AnnotatedComponent<C>) | AnnotatedComponent<C>
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
) => component[REGISTRY_PROP] ?? ({} as Record<string, RuntimeEntry<any, C>>);

const getStaticComponent = <C extends React.FC<any>>(
  component: C & AnnotatedComponent<C>
) => component[COMPONENT_PROP];

const hoistOriginalComponent = <
  C extends React.FC<any>,
  C1 extends React.FC<any>,
>(
  Wrapper: C & AnnotatedComponent<C>,
  target: C1
) => {
  Wrapper[COMPONENT_PROP] = target as ExtractStaticComponent<C>;
};

const hoistUpdatedRegistry = <C extends React.FC<any>, R>(
  Wrapper: C & AnnotatedComponent<C>,
  registry: Record<string, RuntimeEntry<R, NoInfer<C>>>
) => {
  Wrapper[REGISTRY_PROP] = registry as ExtractStaticRegistry<C>;
};

function collectRuntimeGraph<C extends React.FC<any>, R>(
  component: C & AnnotatedComponent<C>,
  entry: RuntimeEntry<R, C>
) {
  const graph: RuntimeEntry<any, any>[] = [];
  const visited = new Set<AnnotatedComponent<any>>();

  function dfs<C1 extends React.FC<any>>(comp: C1 & AnnotatedComponent<C1>) {
    if (visited.has(comp)) return;
    visited.add(comp);

    const registry = getStaticRegistry(comp);
    const appendedRegistry =
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      comp === component ? { ...registry, [entry.id]: entry } : registry;

    for (const [key] of Object.entries(appendedRegistry)) {
      const item = appendedRegistry[key] as RuntimeEntry<R, React.FC<any>>;
      graph.push(item);

      // avoid reading the reference of the component we are creating, as in: if using withRuntime(AppRuntime), skip reading the reference in AppRuntime when traversing the component registries. This is okay, because this component is always the leaf and we are only interested in what goes up, which is always defined directly on the component registry itself (through withUpstream)
      let ref: AnnotatedComponent<any> | undefined;
      try {
        ref = entry.context.reference();
      } catch (_) {
        ref = undefined;
      }
      // we currently only support a single reference (assuming a single withRuntime usage for a runtime)
      if (ref) dfs(ref);
    }
  }

  dfs(component);
  return graph;
}

function topologicalSort<R, C extends AnnotatedComponent<any>>(
  entries: RuntimeEntry<R, C>[]
): Array<RuntimeEntry<any, any> & { level: number }> {
  const contextToEntry = new Map<string, RuntimeEntry<any, any>>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const result: Array<RuntimeEntry<any, any> & { level: number }> = [];

  for (const entry of entries) {
    contextToEntry.set(entry.id, entry);
    inDegree.set(entry.id, 0);
  }

  for (const entry of entries) {
    let ref: AnnotatedComponent<any> | undefined;
    let depId: string | undefined;
    try {
      ref = entry.context.reference();
      depId = [...contextToEntry.entries()].find(
        ([, e]) => e.context.reference() === ref
      )?.[0];
    } catch (_) {
      ref = undefined;
      depId = undefined;
    }
    if (ref && depId) {
      const deps = adjacency.get(depId) ?? [];
      adjacency.set(depId, [...deps, entry.id]);
      inDegree.set(entry.id, (inDegree.get(entry.id) ?? 0) + 1);
    }
  }

  const queue: Array<{
    ctx: RuntimeContextReference<R, C>;
    id: string;
    level: number;
  }> = [];
  for (const entry of entries) {
    if (inDegree.get(entry.id)! === 0) {
      queue.push({ ctx: entry.context, id: entry.id, level: 0 });
    }
  }
  const seen = new Set<string>();

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);

    const entry = contextToEntry.get(id);
    if (entry) result.push({ ...entry, level });

    const dependents = adjacency.get(id) ?? [];
    for (const dep of dependents) {
      inDegree.set(dep, inDegree.get(dep)! - 1);
      if (inDegree.get(dep)! === 0) {
        const depEntry = contextToEntry.get(dep);
        if (depEntry) {
          queue.push({ ctx: depEntry.context, id: dep, level: level + 1 });
        }
      }
    }
  }

  for (const [id, entry] of contextToEntry.entries()) {
    if (!seen.has(id)) {
      result.push({ ...entry, level: 0 });
    }
  }

  return result;
}

export function withRuntime<R, TProps, C extends React.FC<any>>(
  Context: RuntimeContextReference<R>,
  getSource: (
    runtimeFactory: (config?: Partial<Config>) => RuntimeApi<R>,
    props: Simplify<Partial<React.ComponentProps<C>>>
  ) => TProps
): (
  Component: C
) => React.FC<Simplify<Omit<FallbackProps<C, Props>, keyof TProps>>> &
  Simplify<ExtractMeta<C>>;

export function withRuntime<TTarget, C extends React.FC<any>>(
  Context: RuntimeContextReference<TTarget>,
  getSource?: (
    runtimeFactory: (config?: Partial<Config>) => RuntimeApi<TTarget>,
    props: Simplify<Partial<React.ComponentProps<C>>>
  ) => void
): (
  Component: C
) => React.FC<Simplify<FallbackProps<C, Props>>> & Simplify<ExtractMeta<C>>;

export function withRuntime<
  C extends React.FC<any>,
  TTarget,
  TProps extends Record<string, unknown> | undefined,
>(
  Context: RuntimeContextReference<TTarget>,
  getSource?: (
    runtimeFactory: (config?: Partial<Config>) => RuntimeApi<TTarget>,
    props: Partial<FallbackProps<C, Props>>
  ) => TProps
) {
  // console.log('withRuntime', Context, getSource);
  return (Component: C) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-confusing-void-expression
    const target = getStaticComponent(Component) ?? Component;
    const registry = getStaticRegistry(Component);
    const id = uuid();
    const entry: RuntimeEntry<TTarget, C> = {
      context: Context,
      configFn: getSource,
      id,
      type: 'runtime' as const,
    };
    const rawGraph = collectRuntimeGraph(Component, entry);
    const sortedRuntimes = topologicalSort(rawGraph);

    const Wrapper: React.FC<Partial<FallbackProps<C, Props>>> = (props) => {
      // console.log('render', id)
      const runtimeInstances = new Map<
        RuntimeContext<any>,
        RuntimeInstance<any>
      >();
      const mergedFromConfigs = {};
      const { layer } = Context.context as unknown as {
        layer: Layer.Layer<TTarget>;
      };

      for (const entry of sortedRuntimes) {
        const { context, configFn, type } = entry;
        const config: Config = {
          componentName: getDisplayName(target, 'Runtime'),
          debug: false,
          postUnmountTTL: 1000,
          env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        };

        const factory = (overrides?: Partial<Config>) => {
          const safeConfig = Object.assign(config, overrides ?? {});
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const upstream = React.use(context.context);
          const runtime =
            // eslint-disable-next-line react-hooks/rules-of-hooks
            upstream ?? useRuntimeInstance(layer, safeConfig);
          runtimeInstances.set(context.context, runtime);
          return {
            runtime,
            use: createUse(context.context, runtimeInstances),
            useFn: createFn(context.context, runtimeInstances),
            useRun: createRun(context.context, runtimeInstances),
          };
        };

        if (type === 'upstream' && config.env !== 'prod') {
          const upstream = React.use(context.context);
          if (!upstream) {
            // Fallback to useRuntimeInstance if not found
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const fallbackRuntime = useRuntimeInstance(layer, config);
            runtimeInstances.set(context.context, fallbackRuntime);
          }
        }

        if (entry.level === 0 && configFn) {
          const propsFromConfig = configFn(factory, props);
          Object.assign(mergedFromConfigs, propsFromConfig);
        } else {
          const instance = factory();
          runtimeInstances.set(context.context, instance.runtime);
        }
      }

      const mergedProps = Object.assign(mergedFromConfigs, props);
      const children =
        createElement(target, mergedProps as never) ??
        (props.children as React.ReactNode) ??
        null;

      const wrapped = sortedRuntimes.reduceRight(
        (acc, { context: { context: Context } }) => (
          <Context.Provider value={runtimeInstances.get(Context)}>
            {acc}
          </Context.Provider>
        ),
        children
      );

      return wrapped;
    };

    const meta = extractMeta(Component);
    const Memo = React.memo(Wrapper);
    Memo.displayName = getDisplayName(Component, 'WithRuntime');

    copyStaticProperties(meta, Memo);
    hoistOriginalComponent(Memo, target);
    hoistUpdatedRegistry(
      Memo,
      Object.assign({}, registry, {
        [entry.id]: entry,
      }) as React.ComponentProps<C>
    );

    return Memo;
  };
}
