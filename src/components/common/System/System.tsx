// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Merge } from 'type-fest';
import { useIsoLayoutEffect } from 'hooks/common/useIsoLayoutEffect';
import { ParentIdContext } from 'hooks/common/useParentId';
import { useStableObject } from 'hooks/common/useStableObject';
import { useProviderTree } from 'hooks/useProviderTree/useProviderTree';
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
  type DeclarationId,
  type IdProp,
  type ProviderApi,
  type RuntimeApiFactory,
  type Extensible,
  type ExtractStaticProps,
  type ResolvedProviderEntry,
} from 'types';
import { createElement, copyStaticProperties, extractMeta } from 'utils/react';
import {
  getStaticProviderList,
  hoistDeclarationId,
  hoistOriginalComponent,
  hoistProviderList,
} from './utils/static';

const useApiProxyFactory = <R,>(
  runtimeApi: RuntimeApiFactory<R>,
  name: string
) =>
  React.useCallback(
    (
      entry: ProviderEntry<R, any, unknown> & { type: 'runtime' | 'upstream' },
      instances: Map<RuntimeKey, RuntimeInstance<any>>,
      factory: (overrides?: Partial<Config>) => RuntimeApi<R>
    ) => {
      return new Proxy<ProviderApi<R>>({} as never, {
        get(_, prop) {
          if (prop === 'runtime') {
            return entry.type === 'upstream'
              ? runtimeApi.create(entry.module, instances)
              : factory();
          }
          if (prop === 'configure' && entry.type === 'runtime') {
            return factory;
          }
          throw new Error(invalidDestructure(name, prop));
        },
      });
    },
    [runtimeApi, name]
  );

const useRuntimeFactory = <R, C extends React.FC<any>>(
  runtimeProvider: ReturnType<typeof useRuntimeProvider>,
  runtimeApi: RuntimeApiFactory<R>,
  name: string
) =>
  React.useCallback(
    (
      id: ComponentId,
      entry: ResolvedProviderEntry<R, C, unknown> & {
        type: 'runtime' | 'upstream';
      },
      instances: Map<RuntimeKey, RuntimeInstance<any>>,
      callback: (instance: RuntimeInstance<any>) => void
    ) =>
      (overrides: Partial<Config> = {}) => {
        const { context } = entry.module;
        const instance = runtimeProvider.register(id, {
          entryId: entry.id,
          index: entry.index,
          context: context,
          config: overrides,
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!instance) {
          throw new Error(
            `[${name}] Runtime instance for provider id "${entry.id}" not found. Did you use withMock or withAutoMock?`
          );
        }
        // instances.set(context.key, instance);
        callback(instance);
        return runtimeApi.create(entry.module, instances);
      },
    [runtimeProvider, runtimeApi, name]
  );

const usePropsProxyFactory = (name: string) =>
  React.useCallback(
    <P extends Record<string, unknown>>(currentProps: P) => {
      return new Proxy(currentProps, {
        get(target, prop: string) {
          const value = target[prop as keyof typeof target];
          if (!(prop in currentProps)) {
            console.warn(noUpstreamMessage(name, prop));
          }
          return value;
        },
      });
    },
    [name]
  );

// Accumulates and merges props across renders for the component.
const useStatefulMerger = <T extends Extensible<unknown>>(initial: T) => {
  const accumulated = React.useRef<T>({ ...initial });

  const update = React.useCallback((props: Partial<T>) => {
    Object.assign(accumulated.current, props);
    return { ...accumulated.current };
  }, []);

  const reset = React.useCallback(() => {
    accumulated.current = { ...initial };
  }, [initial]);

  const get = React.useCallback(() => {
    return { ...accumulated.current };
  }, []);

  return useStableObject({ update, reset, get });
};

const useEntryBuilder = <R, C extends React.FC<any>>(
  runtimeProvider: ReturnType<typeof useRuntimeProvider>,
  componentId: ComponentId,
  hasRun: React.RefObject<boolean>,
  name: string
) => {
  const createRuntimeApi = useRuntimeApi();
  const createApiProxy = useApiProxyFactory<R>(createRuntimeApi, name);
  const createPropsProxy = usePropsProxyFactory(name);
  const createRuntime = useRuntimeFactory<R, C>(
    runtimeProvider,
    createRuntimeApi,
    name
  );

  const currentProps = useStatefulMerger({
    id: componentId,
  } as unknown as Merge<
    Partial<React.ComponentProps<C>>,
    ExtractStaticProps<C> & IdProp
  >);
  return React.useCallback(
    (
      entries: ResolvedProviderEntry<R, C, unknown>[],
      instances: Map<RuntimeKey, RuntimeInstance<any>>
    ) => {
      entries.forEach((entry) => {
        if (entry.type === 'upstream') {
          const { context } = entry.module;
          const instance = runtimeProvider.getByKey(
            componentId,
            context.key,
            entry.index
          );
          if (instance) {
            instances.set(context.key, instance);
          } else {
            throw new Error(
              `[${name}] Runtime instance for upstream "${context.key.toString()}" not found. Did you use withMock or withAutoMock in your test?`
            );
          }
        }

        if (entry.type === 'runtime' || entry.type === 'upstream') {
          const factory =
            !hasRun.current && entry.type === 'runtime'
              ? createRuntime(componentId, entry, instances, (instance) => {
                  instances.set(entry.module.context.key, instance);
                })
              : () => createRuntimeApi.create(entry.module, instances);
          const apiProxy = createApiProxy(entry, instances, factory);
          const propsProxy = createPropsProxy(currentProps.get());

          if (entry.fn) {
            // this call triggers the runtime to be created
            const maybeProps = entry.fn(apiProxy, propsProxy);
            if (maybeProps) {
              currentProps.update(maybeProps);
            }
          } else if (entry.type === 'runtime') {
            // in case we don't have a function, we still create the instance, for dependency injection.
            factory();
          }
        }

        if (entry.type === 'props') {
          const newProps = entry.fn(currentProps.get());
          currentProps.update(newProps ?? {});
        }
      });
      return currentProps.get();
    },
    [
      createApiProxy,
      createPropsProxy,
      createRuntime,
      createRuntimeApi,
      runtimeProvider,
      componentId,
      currentProps,
      hasRun,
      name,
    ]
  );
};

let count = 0;
export function createSystem<R, C extends React.FC<any>>(
  declarationId: DeclarationId,
  Component: C,
  target: React.FC<any>,
  name: string,
  provider?: ProviderEntry<R, C>
) {
  const Wrapper: React.FC<IdProp & Partial<React.ComponentProps<C>>> = (
    props
  ) => {
    const hasRun = React.useRef(false);
    const disposed = React.useRef(false);
    const componentId = props.id as ComponentId;

    const localEntries = getStaticProviderList<C, R>(Component, provider);
    const entries = useUpstreamProviders(Component, provider);

    const treeMap = useTreeMap(componentId);
    const runtimeProvider = useRuntimeProvider(componentId, treeMap);
    const providerTree = useProviderTree(treeMap);

    if (!hasRun.current) {
      count++;
      providerTree.register(componentId, declarationId, localEntries);
      const resolved = providerTree.resolveUpstream(componentId);
      console.log(count, name, componentId, resolved);
    }

    const instances = React.useMemo(
      () => new Map<RuntimeKey, RuntimeInstance<any>>(),
      []
    );

    //* We need a method that takes a set of runtime keys and returns a map with runtime instances, using useSyncExternalStore. This way we can compare runtime ids, between getSnapshot calls, to return a stable map. When ids change, the component will re-render, which allows upstream fast refresh, to update downstream components that depend on upstream runtimes. In order to make this happen, runtimeRegistry, should use this method to register the component id under each runtime id associated with the provided key.

    const reconstructionLevels = new Set<number>();
    // let needsLateReconstruction = false;
    let currentLevel = entries[0].level;
    // const accumulatedProps = React.useRef({ id: componentId });

    // think about it, whether we really need to reconstruct everything from upstream, because all we really need from upstream is whatever is pulled in from withUpstream at level 0. Because every component instantiaties before its child, and registers as parent, we can rely on registry.getByKey, to resolve from the closest component.

    // This happens when upstream dependencies are included downstream who are connected higher in the tree, then the ones included by the root component.

    const needsLateReconstruction = localEntries.some((item) => {
      if (item.type === 'upstream') {
        const { context } = item.module;
        const instance = runtimeProvider.getByKey(
          props.id as ComponentId,
          context.key
        );
        return !instance && !treeMap.isRoot(componentId);
      }
    });

    // This is the main entry point for the system, which builds the entries and registers them in the provider tree. Don't fuck with this.

    const buildEntries = useEntryBuilder<R, C>(
      runtimeProvider,
      componentId,
      hasRun,
      name
    );

    // this is the main entry point for the system, which builds the entries and registers them in the provider tree.
    const resultProps = buildEntries(localEntries, instances);

    // make sure we clean up even if effect cleanup doesn't run, since our first render has side effects.
    //
    queueMicrotask(runtimeProvider.gcUnpromoted);
    useIsoLayoutEffect(() => {
      runtimeProvider.promote();
      if (disposed.current) {
        runtimeProvider.keepAlive();
        disposed.current = false;
      }
      return () => {
        runtimeProvider.unregister();
        disposed.current = true;
      };
    });

    // The only case that diverges here is in portable scenarios. In this case we have to traverse upstream from the root, to rebuild everything there.

    // In late reconstuctions, we simply register at the root component id when anything from withUpstream is missing.

    // ofcourse this has all impact en terms of fast refresh behavior. That's something to think about but that's for later.

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
        } else {
          reconstructionLevels.add(entry.level);
        }
      });

    const reconstructionThreshold = Math.max(...reconstructionLevels.values());

    const currentProps = useStatefulMerger({
      id: componentId,
    });

    entries
      .filter(
        (entry) =>
          (treeMap.isRoot(componentId) || needsLateReconstruction) &&
          entry.level <= reconstructionThreshold
      )
      .forEach((entry) => {
        if (entry.level < currentLevel) {
          currentProps.update(
            entry.level === 0
              ? { ...props, id: props.id as ComponentId }
              : { id: componentId }
          );
          currentLevel = entry.level;
        }
        // const currentProps = Object.assign(
        //   {},
        //   entry.level === 0 ? props : {},
        //   accumulatedProps.current
        // );
      });

    hasRun.current = true;
    const mergedProps = Object.assign({}, resultProps, props);
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

export const propagateSystem = <C extends React.FC<any>>(
  declarationId: DeclarationId,
  Component: React.FC<any>,
  Wrapper: C,
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
