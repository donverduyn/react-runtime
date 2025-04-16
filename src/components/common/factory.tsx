// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Layer } from 'effect';
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
} from 'utils/react';
import type {
  ExtractStaticComponent,
  ExtractStaticRegistry,
  RuntimeApi,
  RuntimeContextReference,
  RuntimeEntry,
  Config,
} from './types';

const RUNTIME_PROP = '__runtimes';
const COMPONENT_PROP = '__component';

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
  Wrapper[RUNTIME_PROP] = registry as ExtractStaticRegistry<C>;
};

function collectRuntimeGraph<C extends React.FC<any>, R>(
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

export const hocFactory = (type: 'runtime' | 'upstream', name: string) => {
  const hoc = function withRuntime<
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
      props: Partial<React.ComponentProps<C>>
    ) => TProps
  ) {
    return (Component: C) => {
      const target = getStaticComponent(Component) ?? Component;
      const registry = getStaticRegistry<C, R>(Component);
      const id = uuid();
      const entry: RuntimeEntry<R, C> = {
        context: Context as RuntimeContextReference<R, C>,
        configFn: getSource,
        id,
        type,
      };

      const Wrapper: React.FC<Partial<React.ComponentProps<C>>> = (props) => {
        const rawGraph = collectRuntimeGraph(Component, entry);
        const runtimeInstances = new Map<
          RuntimeContext<any>,
          RuntimeInstance<any>
        >();
        const mergedFromConfigs = {};
        const { layer } = Context.context as unknown as {
          layer: Layer.Layer<R>;
        };

        console.log(rawGraph);

        rawGraph.forEach((entry) => {
          const { context, configFn, type } = entry;
          const config: Config = {
            componentName: getDisplayName(target, 'Runtime'),
            debug: false,
            postUnmountTTL: 1000,
            env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
          };

          const factory = (overrides?: Partial<Config>) => {
            if (type === 'runtime') {
              const safeConfig = Object.assign(config, overrides ?? {});
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const upstream = React.use(context.context);
              const runtime =
                // eslint-disable-next-line react-hooks/rules-of-hooks
                upstream ?? useRuntimeInstance(layer, safeConfig);
              runtimeInstances.set(context.context, runtime);
            }
            const runtime = runtimeInstances.get(context.context);
            if (!runtime) {
              throw new Error(
                `[${name}] Runtime not found for context ${String(
                  context.context
                )}`
              );
            }
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
          if (configFn) {
            const proxyArg = new Proxy(
              {},
              {
                get(_, prop) {
                  if (prop === 'configure') return factory;
                  if (prop === 'runtime') return factory();
                  throw new Error(
                    `[${name}] Invalid destructure "${String(prop)}". Use "runtime" or "configure".`
                  );
                },
              }
            );

            const maybeProps = configFn(
              proxyArg as {
                runtime: RuntimeApi<R>;
                configure: typeof factory;
              },
              props
            );

            if (entry.level === 0 && maybeProps) {
              Object.assign(mergedFromConfigs, maybeProps);
            }

            // if (configFn) {

            // const maybeProps = configFn(factory, props);
            // if (entry.level === 0 && maybeProps) {
            //   Object.assign(mergedFromConfigs, maybeProps);
            // }
          } else if (type === 'runtime') {
            const instance = factory();
            runtimeInstances.set(context.context, instance.runtime);
          }
        });

        const mergedProps = Object.assign(mergedFromConfigs, props);
        const children =
          createElement(target, mergedProps as never) ??
          (props.children as React.ReactNode) ??
          null;

        return rawGraph
          .filter((item) => item.type === 'runtime')
          .reduceRight(
            (acc, { context: { context: Context } }) => (
              <Context.Provider value={runtimeInstances.get(Context)}>
                {acc}
              </Context.Provider>
            ),
            children
          );
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
        [RUNTIME_PROP]: ExtractStaticRegistry<C> extends never
          ? [typeof Context]
          : [...ExtractStaticRegistry<C>, typeof Context];
        [COMPONENT_PROP]: ExtractStaticComponent<C>;
      };
    };
  };
  return hoc;
};
