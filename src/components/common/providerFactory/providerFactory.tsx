// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { IsEqual, Merge } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { ParentIdContext } from 'hooks/common/useParentId';
import { getComponentRegistry } from 'hooks/useComponentRegistry/useComponentRegistry';
import { useRuntimeApi } from 'hooks/useRuntimeApi/useRuntimeApi';
import { useRuntimeProvider } from 'hooks/useRuntimeProvider/useRuntimeProvider';
import { useTreeMap } from 'hooks/useTreeMap/useTreeMap';
import { useUpstreamProviders } from 'hooks/useUpstreamProviders/useUpstreamProviders';
import {
  ComponentId,
  ParentId,
  RuntimeKey,
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
  type ProviderId,
  ID_PROP,
  type DeclarationId,
} from 'types';
import {
  createElement,
  getDisplayName,
  copyStaticProperties,
  extractMeta,
} from 'utils/react';
import { isRuntimeModule } from 'utils/runtime';

const getStaticProviderList = <C extends React.FC<any>, R>(
  component: C & { [PROVIDERS_PROP]?: ProviderEntry<R, C>[] }
) => component[PROVIDERS_PROP] ?? ([] as ProviderEntry<R, C>[]);

const getStaticComponent = <C extends React.FC<any>>(
  component: C & { [COMPONENT_PROP]?: React.FC<any> }
) => component[COMPONENT_PROP];

const getStaticDeclarationId = <C extends React.FC<any>>(
  component: C & { [ID_PROP]?: string }
): string | undefined => component[ID_PROP];

const hoistDeclarationId = <C extends React.FC<any>>(
  Wrapper: C & { [ID_PROP]?: string },
  id: string
) => {
  Wrapper[ID_PROP] = id;
};

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

export const providerFactory = <Type extends 'runtime' | 'upstream' | 'props'>(
  type: Type,
  name: string
) => {
  function HOC<
    R,
    C extends React.FC<any>,
    CRef extends React.FC<any>,
    TProps extends
      | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
      | undefined,
  >(
    moduleOrFn: RuntimeModule<R, CRef> | PropsConfigFn<C, TProps>,
    fn?: ProviderConfigFn<R, C, TProps>
  ) {
    const isModuleFirst = isRuntimeModule<R>(moduleOrFn);
    const module = isModuleFirst ? moduleOrFn : undefined;
    const configFn = !isModuleFirst ? moduleOrFn : fn;

    return (Component: C) => {
      const declarationId = (getStaticDeclarationId(Component) ??
        uuid()) as DeclarationId;
      const hocId = uuid();

      const target = getStaticComponent(Component) ?? Component;
      const localProviders = getStaticProviderList<C, R>(Component);
      const componentRegistry = getComponentRegistry();

      const provider: ProviderEntry<R, C> = (() => {
        if (type === 'props') {
          return {
            id: hocId as ProviderId,
            type: 'props',
            configFn: configFn as PropsConfigFn<C>,
          };
        } else {
          return {
            id: hocId as ProviderId,
            type,
            module: module!,
            configFn: configFn as ProviderConfigFn<R, C>,
          };
        }
      })();

      const Wrapper: React.FC<
        { readonly id: string } & Partial<React.ComponentProps<C>>
      > = (props) => {
        const hasRun = React.useRef(false);

        const componentId = props.id as ComponentId;
        const entries = useUpstreamProviders(Component, provider);
        // const componentRegistry = useComponentRegistry();
        const runtimeApi = useRuntimeApi();

        const treeMap = useTreeMap(componentId);
        const runtimeProvider = useRuntimeProvider(componentId, treeMap);

        const instances = new Map<RuntimeKey, RuntimeInstance<any>>();
        const upstreamIds = new Set<ProviderId>();

        //* We need a method that takes a set of runtime keys and returns a map with runtime instances, using useSyncExternalStore. This way we can compare runtime ids, between getSnapshot calls, to return a stable map. When ids change, the component will re-render, which allows upstream fast refresh, to update downstream components that depend on upstream runtimes. In order to make this happen, runtimeRegistry, should use this method to register the component id under each runtime id associated with the provided key.

        const reconstructionLevels = new Set<number>();
        let currentLevel = entries[0].level;
        let accumulatedProps = { id: componentId };

        entries
          .filter((item) => item.type === 'runtime' && item.level !== 0)
          .forEach((entry) => {
            const { module } = entry as ProviderEntry<any, any> & {
              type: 'runtime';
            };
            const instance = runtimeProvider.getByKey(
              props.id as ComponentId,
              module.context.key
            );
            if (instance) {
              instances.set(module.context.key, instance);
              upstreamIds.add(entry.id);
            } else {
              reconstructionLevels.add(entry.level);
            }
          });

        const reconstructionThreshold = Math.max(
          ...reconstructionLevels.values()
        );

        const needsLateReconstruction =
          !treeMap.isRoot(componentId) &&
          entries
            .filter((item) => item.type === 'upstream' && item.level === 0)
            .some((entry) => {
              const { module } = entry as ProviderEntry<any, any> & {
                type: 'upstream';
              };
              const instance = runtimeProvider.getByKey(
                props.id as ComponentId,
                module.context.key
              );
              return !instance;
            });

        entries
          .filter(
            (entry) =>
              entry.level === 0 ||
              ((treeMap.isRoot(componentId) || needsLateReconstruction) &&
                entry.level <= reconstructionThreshold)
          )
          .forEach((entry) => {
            if (entry.level < currentLevel) {
              accumulatedProps =
                entry.level === 0
                  ? { ...props, id: props.id as ComponentId }
                  : { id: componentId };

              currentLevel = entry.level;
            }
            const currentProps = Object.assign(
              {},
              entry.level === 0 ? props : {},
              accumulatedProps
            );

            if (entry.type === 'props') {
              Object.assign(
                accumulatedProps,
                entry.configFn?.(currentProps) ?? {}
              );
              return;
            }

            const { module, configFn, type } = entry;
            const runtimeFactory = (overrides: Partial<Config> = {}) => {
              const instance = !hasRun.current
                ? runtimeProvider.register(accumulatedProps.id, {
                    entryId: entry.id,
                    context: module.context,
                    config: overrides,
                  })
                : runtimeProvider.getByKey(
                    accumulatedProps.id,
                    module.context.key
                  );
              instances.set(module.context.key, instance!);
              return runtimeApi.create(module, instances);
            };

            if (configFn) {
              type ApiType = {
                runtime: RuntimeApi<R>;
                configure: typeof runtimeFactory;
              };
              const apiProxy = new Proxy<ApiType>({} as never, {
                get(_, prop) {
                  if (prop === 'runtime') {
                    return type === 'upstream'
                      ? runtimeApi.create(module, instances)
                      : runtimeFactory();
                  }
                  if (prop === 'configure' && type === 'runtime') {
                    return runtimeFactory;
                  }

                  throw new Error(invalidDestructure(name, prop));
                },
              });

              const propsProxy = new Proxy(currentProps, {
                get(target, prop: string) {
                  const value = target[prop as keyof typeof target];
                  if (!(prop in currentProps)) {
                    console.warn(noUpstreamMessage(name, prop));
                  }
                  return value;
                },
              });

              const maybeProps = configFn(apiProxy, propsProxy);
              if (maybeProps) {
                Object.assign(accumulatedProps, maybeProps);
              }
            } else if (type === 'runtime') {
              runtimeFactory();
            }
          });

        hasRun.current = true;
        runtimeProvider.resetCount(componentId);
        const mergedProps = Object.assign(accumulatedProps, props);
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
      hoistDeclarationId(Memo, declarationId);
      hoistProviderList(
        Memo,
        localProviders.concat(provider) as React.ComponentProps<C>
      );

      componentRegistry.register(declarationId, Memo);
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
  return HOC;
};

function noUpstreamMessage(name: string, prop: unknown) {
  return `[${name}] "${String(
    prop
  )}" is undefined, because components are not rendered upstream in portable scenarios. This may cause inconsistent behavior.`;
}

function invalidDestructure(name: string, prop: unknown) {
  return `[${name}] Invalid destructure "${String(prop)}". Use "runtime" or "configure".`;
}
