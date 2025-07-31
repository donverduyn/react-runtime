// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Merge } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { ParentIdContext } from 'hooks/common/useParentId';
import { createUse } from 'hooks/use';
import { createFn } from 'hooks/useFn';
import { createRun } from 'hooks/useRun';
import { useComponentMap } from 'hooks/useRuntimeProvider/hooks/useComponentMap';
import type {
  ComponentId,
  ParentId,
  RuntimeKey,
} from 'hooks/useRuntimeProvider/types';
import { useRuntimeProvider } from 'hooks/useRuntimeProvider/useRuntimeProvider';
import {
  createElement,
  getDisplayName,
  copyStaticProperties,
  extractMeta,
} from 'utils/react';
import {
  type ExtractStaticComponent,
  type ExtractStaticHocEntries,
  type RuntimeApi,
  type RuntimeModule,
  type RuntimeHocEntry,
  type Config,
  type PROPS_PROP,
  type ExtractStaticProps,
  COMPONENT_PROP,
  RUNTIME_PROP,
  type UPSTREAM_PROP,
  type TraverseDeps,
  type RuntimeInstance,
  type RuntimeConfigFn,
} from './types';

export const defaultConfig = {
  debug: false,
  postUnmountTTL: 1000,
  env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
  cleanupPolicy: 'onUnmount', // only used with replace: true
  replace: false,
} satisfies Partial<Config>;

const getStaticRuntimeHocEntryList = <C extends React.FC<any>, R>(
  component: C & { [RUNTIME_PROP]?: RuntimeHocEntry<R, C>[] }
) => component[RUNTIME_PROP] ?? ([] as RuntimeHocEntry<R, C>[]);

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

const hoistEntryList = <C extends React.FC<any>, R>(
  Wrapper: C & { [RUNTIME_PROP]?: RuntimeHocEntry<R, C>[] },
  entries: RuntimeHocEntry<R, C>[]
) => {
  Wrapper[RUNTIME_PROP] = entries as ExtractStaticHocEntries<C>;
};

function collectEntriesUpstream<C extends React.FC<any>, R>(
  component: C,
  entry: RuntimeHocEntry<R, C>
) {
  const graph: (RuntimeHocEntry<any, any> & {
    level: number;
    index: number;
  })[] = [];
  const visited = new Set<React.FC<any>>();

  function dfs(
    comp: C & { [RUNTIME_PROP]?: RuntimeHocEntry<R, C>[] },
    level: number
  ) {
    if (visited.has(comp)) return;
    visited.add(comp);

    const entries = getStaticRuntimeHocEntryList<C, R>(comp);
    const appendedRegistry =
      comp === component ? entries.concat(entry) : entries;

    appendedRegistry.forEach((item, index) => {
      graph.push(Object.assign({}, item, { level, index }));

      const ref =
        item.module !== entry.module ? item.module.reference() : undefined;
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

const createRuntimeHocEntry = <R, C extends React.FC<any>>(
  entry: RuntimeHocEntry<R, C>
) => entry;

export const providerFactory = (type: 'runtime' | 'upstream', name: string) => {
  function createHoc<
    C extends React.FC<any>,
    R,
    TProps extends Record<string, unknown> | undefined,
  >(
    Module: RuntimeModule<R>,
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
      const entries = getStaticRuntimeHocEntryList<C, R>(Component);
      const hocId = uuid();
      const entry = createRuntimeHocEntry<R, C>({
        module: Module as RuntimeModule<R, C>,
        configFn: getSource as RuntimeConfigFn<R, C>,
        id: hocId,
        type,
      });

      const Wrapper: React.FC<
        { readonly id: string } & Partial<React.ComponentProps<C>>
      > = (props) => {
        const entries = collectEntriesUpstream(Component, entry);
        const componentMap = useComponentMap();

        // check what the difference is between target and Component for displayName -> is displayName propagated from target?
        componentMap.register(props.id as ComponentId, {
          name: getDisplayName(target),
        });

        // maybe keep this in useComponentMap with a single hook, but think about who needs this data. if we want to use this data inside runtimeRegistry (which we do), we might want to avoid implicit coupling, and let runtimeRegistry call callback arguments instead.
        React.useEffect(() => () => {
          componentMap.dispose(props.id as ComponentId);
        });

        const runtimeProvider = useRuntimeProvider(props.id as ComponentId);

        const runtimeInstances = new Map<RuntimeKey, RuntimeInstance<any>>();

        const upstreamKeys = new Set<RuntimeKey>();

        entries
          // in normal scenarios, we pull in all upstream dependencies here, but in portable scenarios, we reconstruct the upstream dependencies at the root, when they are missing.
          .filter((item) => item.type === 'runtime' && item.level !== 0)
          .forEach((entry) => {
            const runtimeKey = entry.module.context.key;
            const instance = runtimeProvider.getByKey(
              props.id as ComponentId,
              runtimeKey
            );
            if (instance) {
              runtimeInstances.set(runtimeKey, instance);
              upstreamKeys.add(runtimeKey);
            }
          });

        let mergedFromConfigs = {};
        let previousLevel = 0;

        entries
          .filter((entry) => {
            // here we filter out upstream runtime entries (if they are provided)
            const runtimeKey = entry.module.context.key;
            return !upstreamKeys.has(runtimeKey);
          })
          .forEach((entry) => {
            const { module, configFn, type } = entry;
            if (entry.level < previousLevel) mergedFromConfigs = {};
            previousLevel = entry.level;

            const factory = (overrides: Partial<Config> = {}) => {
              const instance = runtimeProvider.register(
                props.id as ComponentId,
                {
                  entryId: entry.id,
                  context: module.context,
                  config: overrides,
                }
              );

              runtimeInstances.set(module.context.key, instance);
              return {
                runtime: instance,
                use: createUse(module.context, runtimeInstances),
                useFn: createFn(module.context, runtimeInstances),
                useRun: createRun(module.context, runtimeInstances),
              };
            };

            if (configFn) {
              // we provide two ways to use a runtime. An imperative api to provide configurations and direct use based on default configurations.

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

              // mergedFromConfigs, is reset on every level, so provided upstream props don't bleed into downstream components. We start with the highest level (the root of the dependency chain), and work down to 0, which is the current component (that does the initialization). Therefore, props is only merged if level is 0.

              const currentProps = Object.assign(
                {},
                mergedFromConfigs,
                entry.level === 0 ? props : {}
              );

              // we use this proxy to show a warning, when reconstructed upstream dependencies miss props. This is important to know, because props can be used to construct dependencies, and if they are not provided, the runtime may not behave as expected.

              const propsProxy = new Proxy(currentProps, {
                get(target, prop: string) {
                  const value = target[prop as keyof typeof target];

                  if (!(prop in currentProps)) {
                    console.warn(noUpstreamMessage(name, prop));
                  }

                  return value;
                },
              });

              // we check here wether the instance is available upstream. If it is not available we reconstruct it inside the component.

              const isAvailableUpstream = upstreamKeys.has(module.context.key);
              if (
                type === 'runtime' ||
                (process.env.NODE_ENV === 'development' && !isAvailableUpstream)
              ) {
                const maybeProps = configFn(
                  proxyArg as {
                    runtime: RuntimeApi<R>;
                    configure: typeof factory;
                  },
                  propsProxy
                );

                // configFn optionally returns new props. We merge these props
                if (maybeProps) {
                  Object.assign(mergedFromConfigs, maybeProps);
                }
              }
            } else if (type === 'runtime') {
              // when withRuntime is used without a configFn, we still need to call factory to ensure the runtime is registered
              factory();
            }
          });

        const mergedProps = Object.assign(mergedFromConfigs, props);
        const children =
          createElement(target, mergedProps as never) ??
          (props.children as React.ReactNode) ??
          null;

        return (
          <ParentIdContext.Provider value={props.id as ParentId}>
            {children}
          </ParentIdContext.Provider>
        );
      };

      const meta = extractMeta(Component);
      const Memo = React.memo(Wrapper);
      Memo.displayName = getDisplayName(Component, name);

      copyStaticProperties(meta, Memo);
      hoistOriginalComponent(Memo, target);
      hoistEntryList(Memo, entries.concat(entry) as React.ComponentProps<C>);

      return Memo as typeof Memo & {
        [UPSTREAM_PROP]: TraverseDeps<{
          [RUNTIME_PROP]: [...ExtractStaticHocEntries<C>, typeof Module];
        }>;
        [RUNTIME_PROP]: [...ExtractStaticHocEntries<C>, typeof Module];
        [COMPONENT_PROP]: ExtractStaticComponent<C>;
        [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
      };
    };
  }
  return createHoc;
};

function noUpstreamMessage(name: string, prop: unknown) {
  return `[${name}] "${String(
    prop
  )}" is undefined, because components are not rendered upstream in portable scenarios. This may cause inconsistent behavior.`;
}

function invalidDestructure(name: string, prop: unknown) {
  return `[${name}] Invalid destructure "${String(prop)}". Use "runtime" or "configure".`;
}
