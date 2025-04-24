// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Merge } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { createUse } from 'hooks/use';
import { createFn } from 'hooks/useFn';
import { createRun } from 'hooks/useRun';
import { useRuntimeInstance } from 'hooks/useRuntimeInstance';
import {
  createElement,
  extractMeta,
  getDisplayName,
  copyStaticProperties,
} from 'utils/react';
import {
  type ExtractStaticComponent,
  type ExtractStaticRuntimes,
  type RuntimeApi,
  type RuntimeContextReference,
  type RuntimeEntry,
  type Config,
  type PROPS_PROP,
  type ExtractStaticProps,
  COMPONENT_PROP,
  RUNTIME_PROP,
  type UPSTREAM_PROP,
  type TraverseDeps,
  type RuntimeContext,
  type RuntimeInstance,
  type RuntimeConfigFn,
} from './types';

export const defaultConfig: Config = {
  componentName: 'Runtime',
  debug: false,
  postUnmountTTL: 1000,
  env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  disposeStrategy: 'unmount', // only used with fresh: true
  fresh: false,
  id: uuid(),
};

const getStaticRegistry = <C extends React.FC<any>, R>(
  component: C & { [RUNTIME_PROP]?: RuntimeEntry<R, C>[] }
) => component[RUNTIME_PROP] ?? ([] as RuntimeEntry<R, C>[]);

const getStaticComponent = <C extends React.FC<any>>(
  component: C & { [COMPONENT_PROP]?: React.FC<any> }
) => component[COMPONENT_PROP];

const hoistOriginalComponent = <
  C extends React.FC<any>,
  C1 extends React.FC<any>,
>(
  Wrapper: C & { [COMPONENT_PROP]?: C1 },
  target: C1
) => {
  Wrapper[COMPONENT_PROP] = target;
};

const hoistUpdatedRegistry = <C extends React.FC<any>, R>(
  Wrapper: C & { [RUNTIME_PROP]?: RuntimeEntry<R, C>[] },
  registry: RuntimeEntry<R, C>[]
) => {
  Wrapper[RUNTIME_PROP] = registry as ExtractStaticRuntimes<C>;
};

function collectRuntimeEntries<C extends React.FC<any>, R>(
  component: C,
  entry: RuntimeEntry<R, C>
) {
  const graph: (RuntimeEntry<any, any> & { level: number; index: number })[] =
    [];
  const visited = new Set<React.FC<any>>();

  function dfs(
    comp: C & { [RUNTIME_PROP]?: RuntimeEntry<R, C>[] },
    level: number
  ) {
    if (visited.has(comp)) return;
    visited.add(comp);

    const registry = getStaticRegistry<C, R>(comp);
    const appendedRegistry =
      comp === component ? registry.concat(entry) : registry;

    appendedRegistry.forEach((item, index) => {
      graph.push(Object.assign({}, item, { level, index }));

      const ref =
        item.context !== entry.context ? item.context.reference() : undefined;
      // we currently only support a single reference (assuming a single withRuntime usage for a runtime)
      if (ref) dfs(ref, level + 1);
    });
  }

  dfs(component, 0);
  return graph.sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level;
    return a.index - b.index;
  });
}

const createRuntimeEntry = <R, C extends React.FC<any>>(
  entry: RuntimeEntry<R, C>
) => entry;

export const hocFactory = (type: 'runtime' | 'upstream', name: string) => {
  function hoc<
    C extends React.FC<any>,
    R,
    TProps extends Record<string, unknown> | undefined,
  >(
    Context: RuntimeContextReference<R>,
    getSource?: (
      api: {
        configure: (config?: Partial<Config>) => RuntimeApi<R>;
        runtime: RuntimeApi<R>;
      },
      props: Merge<React.ComponentProps<C>, ExtractStaticProps<C>>
    ) => TProps
  ) {
    return (Component: C) => {
      const target = getStaticComponent(Component) ?? Component;
      const registry = getStaticRegistry<C, R>(Component);
      const hocId = uuid();
      const entry = createRuntimeEntry<R, C>({
        context: Context as RuntimeContextReference<R, C>,
        configFn: getSource as RuntimeConfigFn<R, C>,
        id: hocId,
        type,
      });

      const Wrapper: React.FC<Partial<React.ComponentProps<C>>> = (props) => {
        const entries = collectRuntimeEntries(Component, entry);
        const runtimeInstances = new Map<
          RuntimeContext<any>,
          RuntimeInstance<any>
        >();

        const upstreamContexts = new Map<
          RuntimeContext<any>,
          RuntimeInstance<any>
        >();

        entries
          .filter((item) => item.type === 'runtime' && item.level !== 0)
          .forEach(({ context }) => {
            const val = React.use(context.context);
            if (val) {
              upstreamContexts.set(context.context, val);
              runtimeInstances.set(context.context, val);
            }
          });

        let mergedFromConfigs = {};
        let previousLevel = 0;

        entries
          .filter((entry) => {
            return !upstreamContexts.has(entry.context.context);
          })
          .forEach((entry) => {
            const { context, configFn, type } = entry;
            if (entry.level < previousLevel) mergedFromConfigs = {};
            previousLevel = entry.level;

            const baseConfig: Config = Object.assign({}, defaultConfig, {
              componentName: getDisplayName(target, 'Runtime'),
              id: entry.level === 0 ? (props.id ?? entry.id) : entry.id,
              ...entry.context.context.config,
            });

            // const { layer } = entry.context.context as unknown as {
            //   layer: Layer.Layer<R>;
            // };
            const factory = (overrides?: Partial<Config>) => {
              const config = Object.assign({}, baseConfig, overrides ?? {});
              const runtime =
                // eslint-disable-next-line react-hooks/rules-of-hooks
                useRuntimeInstance(entry.context.context, config);
              runtimeInstances.set(context.context, runtime);
              // contextToId.set(context, runtime.id); // Store the context to ID mapping

              return {
                runtime,
                use: createUse(context.context, runtimeInstances),
                useFn: createFn(context.context, runtimeInstances),
                useRun: createRun(context.context, runtimeInstances),
              };
            };

            if (type === 'upstream' && baseConfig.env !== 'prod') {
              const upstream = runtimeInstances.get(context.context);
              if (!upstream) {
                // Fallback to useRuntimeInstance if not found
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const fallbackRuntime = useRuntimeInstance(
                  entry.context.context,
                  baseConfig
                );
                runtimeInstances.set(context.context, fallbackRuntime);
              }
            }
            if (configFn) {
              const proxyArg = new Proxy(
                {},
                {
                  get(_, prop) {
                    if (prop === 'configure') return factory;
                    if (prop === 'runtime') return factory();
                    throw new Error(invalidDestructure(name, prop));
                  },
                }
              );

              const currentProps = Object.assign(
                {},
                mergedFromConfigs,
                entry.level === 0 ? props : {}
              );
              const propsProxy = new Proxy(currentProps, {
                get(target, prop: string) {
                  const value = target[prop as keyof typeof target];
                  if (!(prop in currentProps)) {
                    console.warn(noUpstreamMessage(name, prop));
                  }

                  return value;
                },
              });

              const maybeProps = configFn(
                proxyArg as {
                  runtime: RuntimeApi<R>;
                  configure: typeof factory;
                },
                propsProxy
              );

              if (entry.level === 0 && maybeProps) {
                Object.assign(mergedFromConfigs, maybeProps);
              }
            } else if (type === 'runtime') {
              factory();
              // const instance = factory();
              // runtimeInstances.set(context.context, instance.runtime);
            }
          });

        const mergedProps = Object.assign(mergedFromConfigs, props);
        const children =
          createElement(target, mergedProps as never) ??
          (props.children as React.ReactNode) ??
          null;

        return entries
          .filter((item) => item.type === 'runtime')
          .reduceRight((acc, { context: { context: Context } }) => {
            const value = upstreamContexts.get(Context);
            if (value) return acc;
            return (
              <Context.Provider value={runtimeInstances.get(Context)}>
                {acc}
              </Context.Provider>
            );
          }, children);
      };

      const meta = extractMeta(Component);
      const Memo = React.memo(Wrapper);
      Memo.displayName = getDisplayName(Component, name);

      copyStaticProperties(meta, Memo);
      hoistOriginalComponent(Memo, target);
      hoistUpdatedRegistry(
        Memo,
        registry.concat(entry) as React.ComponentProps<C>
      );

      return Memo as typeof Memo & {
        [UPSTREAM_PROP]: TraverseDeps<{
          [RUNTIME_PROP]: [...ExtractStaticRuntimes<C>, typeof Context];
        }>;
        [RUNTIME_PROP]: [...ExtractStaticRuntimes<C>, typeof Context];
        [COMPONENT_PROP]: ExtractStaticComponent<C>;
        [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
      };
    };
  }
  return hoc;
};

function noUpstreamMessage(name: string, prop: unknown) {
  return `[${name}] "${String(
    prop
  )}" is undefined, because components are not rendered upstream in portable scenarios. This may cause inconsistent behavior.`;
}

function invalidDestructure(name: string, prop: unknown) {
  return `[${name}] Invalid destructure "${String(prop)}". Use "runtime" or "configure".`;
}
