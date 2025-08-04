// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { IsEqual, Merge } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { ParentIdContext } from 'hooks/common/useParentId';
import { useComponentRegistry } from 'hooks/useComponentRegistry/useComponentRegistry';
import { useProviderEntries } from 'hooks/useProviderEntries/useProviderEntries';
import { useRuntimeApi } from 'hooks/useRuntimeApi/useRuntimeApi';
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
import { isRuntimeModule } from 'utils/runtime';
import {
  type ExtractStaticComponent,
  type ExtractStaticProviders,
  type RuntimeApi,
  type RuntimeModule,
  type ProviderEntry as ProviderEntry,
  type Config,
  type PROPS_PROP,
  type ExtractStaticProps,
  COMPONENT_PROP,
  PROVIDERS_PROP,
  type UPSTREAM_PROP,
  type TraverseDeps,
  type RuntimeInstance,
  type ProviderConfigFn,
  type PropsConfigFn,
} from './types';

const getStaticProviderList = <C extends React.FC<any>, R>(
  component: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] }
) => component[PROVIDERS_PROP] ?? ([] as ProviderEntry<R, C>[]);

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

const hoistProviderList = <C extends React.FC<any>, R>(
  Wrapper: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] },
  entries: ProviderEntry<R, C>[]
) => {
  Wrapper[PROVIDERS_PROP] = entries as ExtractStaticProviders<C>;
};

const createProviderEntry = <R, C extends React.FC<any>>(
  entry: ProviderEntry<R, C>
): ProviderEntry<R, C> => entry;

export const providerFactory = <Type extends 'runtime' | 'upstream' | 'props'>(
  type: Type,
  name: string
) => {
  const create = <
    R,
    C extends React.FC<any>,
    TProps extends
      | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
      | undefined,
  >(
    moduleOrFn: RuntimeModule<R> | PropsConfigFn<C, TProps>,
    configFn?: ProviderConfigFn<R, C, TProps>
  ) => {
    const isModuleFirst = isRuntimeModule<R>(moduleOrFn);
    const module = isModuleFirst ? moduleOrFn : undefined;
    const fn = !isModuleFirst ? moduleOrFn : configFn;
    return HOC<R, C, TProps>(module, fn);
  };

  function HOC<
    R,
    C extends React.FC<any>,
    TProps extends
      | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
      | undefined,
  >(
    module: RuntimeModule<R> | undefined,
    configFn?: ProviderConfigFn<R, C, TProps> | PropsConfigFn<C, TProps>
  ) {
    return (Component: C) => {
      const target = getStaticComponent(Component) ?? Component;
      const entries = getStaticProviderList<C, R>(Component);
      const hocId = uuid();
      const entry = (() => {
        if (type === 'props') {
          return createProviderEntry<R, C>({
            id: hocId,
            type: 'props',
            configFn: configFn as PropsConfigFn<C>,
          });
        } else {
          return createProviderEntry<R, C>({
            id: hocId,
            type,
            module: module as RuntimeModule<R, C>,
            configFn: configFn as ProviderConfigFn<R, C>,
          });
        }
      })();

      const Wrapper: React.FC<
        { readonly id: string } & Partial<React.ComponentProps<C>>
      > = (props) => {
        const entries = useProviderEntries(Component, entry);
        const componentMap = useComponentRegistry();
        const runtimeApi = useRuntimeApi();

        // check what the difference is between target and Component for displayName -> is displayName propagated from target?
        componentMap.register(props.id as ComponentId, {
          name: getDisplayName(target),
        });

        // maybe keep this in useComponentMap with a single hook, but think about who needs this data. if we want to use this data inside runtimeRegistry (which we do), we might want to avoid implicit coupling, and let runtimeRegistry call callback arguments instead.
        React.useEffect(() => () => {
          componentMap.dispose(props.id as ComponentId);
        });

        // we inject the _dryRun prop when we traverse downstream, to avoid polluting the treeMap, because in a dry run, everything runs in the same component render (without the intermediate context providers shadowing the previous parent ids).
        const runtimeProvider = useRuntimeProvider(
          props.id as ComponentId,
          props._dryRun as boolean
        );
        const instances = new Map<RuntimeKey, RuntimeInstance<any>>();
        const upstreamKeys = new Set<RuntimeKey>();

        //* We need a method that takes a set of runtime keys and returns a map with runtime instances, using useSyncExternalStore. This way we can compare runtime ids, between getSnapshot calls, to return a stable map. When ids change, the component will re-render, which allows upstream fast refresh, to update downstream components that depend on upstream runtimes. In order to make this happen, runtimeRegistry, should use this method to register the component id under each runtime id associated with the provided key.

        entries
          // in normal scenarios, we pull in all upstream dependencies here, but in portable scenarios, we reconstruct the upstream dependencies at the root, when they are missing.
          .filter((item) => item.type === 'runtime' && item.level !== 0)
          .forEach((entry) => {
            const { module } = entry as ProviderEntry<any, any> & {
              type: 'runtime';
            };
            const runtimeKey = module.context.key;
            const instance = runtimeProvider.getByKey(
              props.id as ComponentId,
              runtimeKey
            );
            if (instance) {
              instances.set(runtimeKey, instance);
              upstreamKeys.add(runtimeKey);
            }
          });

        let mergedFromConfigs = {};
        let previousLevel = entries[0].level;

        entries
          .filter((entry) => {
            // here we filter out upstream runtime entries (if they are provided)
            if (entry.type === 'runtime') {
              const runtimeKey = entry.module.context.key;
              return !upstreamKeys.has(runtimeKey);
            } else {
              return runtimeProvider.isRoot() || entry.level === 0;
              // this makes sure that in portable scenarios, we keep including type props/upstream entries at the root from upstream components, so they can be reconstructed here. In normal situations, there are no upstream entries at the root so this comes without extra costs.

              // in downstream components, we only include runtime entries, since everything is provided from upstream or root.
            }
          })
          .forEach((entry) => {
            if (entry.type === 'props') {
              // props entries are not registered in the runtime provider, but are used to provide props to the component
              const currentProps = Object.assign(
                {},
                entry.level === 0 || runtimeProvider.isRoot() ? props : {},
                mergedFromConfigs
              );

              //* we should use withMock to mock props in tests, by providing a reference to the component and a function that returns the props to be mocked.

              Object.assign(
                mergedFromConfigs,
                entry.configFn?.(currentProps) ?? {}
              );
              return;
            }
            const { module, configFn, type } = entry;
            // when we change component during reconstruction
            if (entry.level < previousLevel) {
              mergedFromConfigs = {};
              previousLevel = entry.level;
            }

            const runtimeFactory =
              (options: { returnOnly: boolean } = { returnOnly: false }) =>
              (overrides: Partial<Config> = {}) => {
                if (!options.returnOnly) {
                  const instance = runtimeProvider.register(
                    props.id as ComponentId,
                    {
                      entryId: entry.id,
                      context: module.context,
                      config: overrides,
                    }
                  );

                  // we copy the instance over into the instances map, so it can be used by the next provider in the chain.
                  instances.set(module.context.key, instance);
                }
                return runtimeApi.create(module, instances);
              };

            if (configFn) {
              // we provide two ways to use a runtime. An imperative api to provide configurations and direct use based on default configurations.

              const proxyArg = new Proxy(
                {},
                {
                  get(_, prop) {
                    const isAvailableUpstream = upstreamKeys.has(
                      module.context.key
                    );
                    const factoryOptions = {
                      returnOnly: type === 'upstream' && isAvailableUpstream,
                    };
                    if (prop === 'runtime') {
                      return runtimeFactory(factoryOptions)();
                    }
                    if (prop === 'configure' && type === 'runtime') {
                      return runtimeFactory(factoryOptions);
                    }

                    throw new Error(invalidDestructure(name, prop));
                  },
                }
              );

              // mergedFromConfigs, is reset on every level, so provided upstream props don't bleed into downstream components. We start with the highest level (the root of the dependency chain), and work down to 0, which is the current component (that does the initialization). Therefore, props is only merged if level is 0.

              const currentProps = Object.assign(
                {},
                entry.level === 0 || runtimeProvider.isRoot() ? props : {},
                mergedFromConfigs
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

              const maybeProps = configFn(
                proxyArg as {
                  runtime: RuntimeApi<R>;
                  configure: ReturnType<typeof runtimeFactory>;
                },
                propsProxy
              );

              // configFn optionally returns new props. We merge these props
              if (maybeProps) {
                Object.assign(mergedFromConfigs, maybeProps);
              }
            } else if (type === 'runtime') {
              // when withRuntime is used without a configFn, we still need to call factory to ensure the runtime is registered
              runtimeFactory()();
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
      hoistProviderList(Memo, entries.concat(entry) as React.ComponentProps<C>);

      return Memo as typeof Memo & {
        [UPSTREAM_PROP]: TraverseDeps<{
          [PROVIDERS_PROP]: [...ExtractStaticProviders<C>, typeof module];
        }>;
        [PROVIDERS_PROP]: IsEqual<typeof type, 'props'> extends true
          ? ExtractStaticProviders<C>
          : [...ExtractStaticProviders<C>, typeof module];
        [COMPONENT_PROP]: ExtractStaticComponent<C>;
        [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
      };
    };
  }
  return create;
};

function noUpstreamMessage(name: string, prop: unknown) {
  return `[${name}] "${String(
    prop
  )}" is undefined, because components are not rendered upstream in portable scenarios. This may cause inconsistent behavior.`;
}

function invalidDestructure(name: string, prop: unknown) {
  return `[${name}] Invalid destructure "${String(prop)}". Use "runtime" or "configure".`;
}
