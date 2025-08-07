// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { ParentIdContext } from 'hooks/common/useParentId';
import { useRuntimeApi } from 'hooks/useRuntimeApi/useRuntimeApi';
import { useRuntimeProvider } from 'hooks/useRuntimeProvider/useRuntimeProvider';
import { useTreeMap } from 'hooks/useTreeMap/useTreeMap';
import { useUpstreamProviders } from 'hooks/useUpstreamProviders/useUpstreamProviders';
import {
  ComponentId,
  ParentId,
  RuntimeKey,
  type RuntimeApi,
  type ProviderEntry as ProviderEntry,
  type Config,
  type RuntimeInstance,
  type ProviderId,
  type DeclarationId,
} from 'types';
import { createElement, copyStaticProperties, extractMeta } from 'utils/react';
import {
  hoistDeclarationId,
  hoistOriginalComponent,
  hoistProviderList,
} from './utils/static';

export function createWrapper<R, C extends React.FC<any>>(
  Component: C,
  target: React.FC<any>,
  name: string,
  provider?: ProviderEntry<R, C>
) {
  const Wrapper: React.FC<
    { readonly id: string } & Partial<React.ComponentProps<C>>
  > = (props) => {
    const hasRun = React.useRef(false);

    const componentId = props.id as ComponentId;
    const entries = useUpstreamProviders(Component, provider);
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

    const reconstructionThreshold = Math.max(...reconstructionLevels.values());

    const needsLateReconstruction =
      !treeMap.isRoot(componentId) &&
      entries
        .filter((item) => item.type === 'upstream' && item.level === 0)
        .some((entry) => {
          const { module } = entry as ProviderEntry<any, any, unknown> & {
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
          Object.assign(accumulatedProps, entry.fn(currentProps) ?? {});
          return;
        }

        const { module, fn, type } = entry;
        const runtimeFactory = (overrides: Partial<Config> = {}) => {
          const instance = !hasRun.current
            ? runtimeProvider.register(accumulatedProps.id, {
                entryId: entry.id,
                context: module.context,
                config: overrides,
              })
            : runtimeProvider.getByKey(accumulatedProps.id, module.context.key);

          if (!instance) {
            throw new Error(
              `[${name}] Runtime instance for provider id "${entry.id}" not found. Did you use withMock or withAutoMock?`
            );
          }
          instances.set(module.context.key, instance);
          return runtimeApi.create(module, instances);
        };

        if (fn) {
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

          const maybeProps = fn(apiProxy, propsProxy);
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
  return Wrapper;
}

export const finalizeWrapper = <C extends React.FC<any>>(
  Wrapper: C,
  Component: React.FC<any>,
  declarationId: DeclarationId,
  target: React.FC<any>,
  allProviders: ProviderEntry<any, any>[],
  targetName: string
) => {
  const meta = extractMeta(Component);
  const Memo = React.memo(Wrapper);
  Memo.displayName = targetName;

  copyStaticProperties(meta, Memo);
  hoistOriginalComponent(Memo, target);
  hoistDeclarationId(Memo, declarationId);
  hoistProviderList(Memo, allProviders as React.ComponentProps<C>);

  return Memo as React.NamedExoticComponent<React.ComponentProps<C>>;
};

function noUpstreamMessage(name: string, prop: unknown) {
  return `[${name}] "${String(
    prop
  )}" is undefined, because components are not rendered upstream in portable scenarios. This may cause inconsistent behavior.`;
}

function invalidDestructure(name: string, prop: unknown) {
  return `[${name}] Invalid destructure "${String(prop)}". Use "runtime" or "configure".`;
}
