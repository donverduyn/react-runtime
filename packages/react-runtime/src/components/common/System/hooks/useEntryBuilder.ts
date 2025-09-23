// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useStatefulMerger } from '@/hooks/common/useStatefulMerger';
import { useRuntimeApi } from '@/hooks/useRuntimeApi/useRuntimeApi';
import type { useRuntimeProvider } from '@/hooks/useRuntimeProvider/useRuntimeProvider';
import type {
  ScopeId,
  ExtractStaticProps,
  IdProp,
  ResolvedProviderEntry,
  RegisterId,
  RuntimeKey,
  RuntimeInstance,
  ProviderApi,
  ProviderEntry,
  RuntimeApi,
  RuntimeApiFactory,
  RuntimeConfig,
  UpstreamProviderApi,
  ProviderId,
  RuntimeContext,
} from '@/types';

export const useApiProxyFactory = <R, P>(
  runtimeApi: RuntimeApiFactory<R, P>,
  name: string
) =>
  React.useCallback(
    (
      provider: ProviderEntry<R, any, unknown> & {
        type: 'runtime' | 'upstream';
      },
      propsProxy: ProviderApi<R>['props'],
      collectFn: (
        module: RuntimeContext<any>
      ) => Map<RuntimeKey, RuntimeInstance<any, any>>,
      factory?: (
        overrides?: Partial<RuntimeConfig>
      ) => RuntimeApi<R, P> | undefined,
      options?: EntryBuilderOptions
    ) => {
      return new Proxy<ProviderApi<R> | UpstreamProviderApi<any>>({} as never, {
        get(_, prop) {
          // factory is only provided when used for runtime providers.
          if (provider.type === 'runtime' && factory) {
            if (prop === 'runtime') return factory();
            if (prop === 'configure') return factory;
          }
          // legacy api
          if (provider.type === 'upstream' && factory) {
            if (prop === 'runtime') {
              return factory();
            }
          }
          if (prop === 'inject') {
            return (module: RuntimeContext<any>) => {
              const instances = collectFn(module);
              // best effort stubbing to proceed module collection.
              if (!instances.has(module.key)) {
                if (options?.stub) {
                  return runtimeApi.createInert(options.stub.value);
                } else {
                  //* we catch this when we run buildEntries, whenever we expect it to throw here.
                  throw new Error(noUpstreamMessage(name, module.key));
                }
              }

              // we use instances to trigger hook updates form runtimeApi hooks. A snapshot is used in the dep array of these hooks, which makes the hooks update if any dependencies have been added or removed (dynamically).
              // however this currently works on context.key, so we don't distinguish between different instances, which we might want to do, so we never have stale references to disposed runtime instances.
              return runtimeApi.create(module, instances);
            };
          }
          if (prop === 'props') return propsProxy;
          throw new Error(invalidDestructure(name, prop));
        },
      });
    },
    [runtimeApi, name]
  );

export const usePropsProxyFactory = (name: string) =>
  React.useCallback(
    <P extends object>(currentProps: P) => {
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

//* useRuntimeFactory calls register, which instantiates the runtime instance and stores it in runtimeProvider.

const useRuntimeFactory = <R, C extends React.FC<any>, P>(
  runtimeApi: RuntimeApiFactory<R, P>,
  name: string
) =>
  React.useCallback(
    (
      id: RegisterId,
      provider: ResolvedProviderEntry<R, C, unknown> & {
        type: 'runtime';
      },
      callback: (
        instance: RuntimeInstance<any, P>
      ) => Map<RuntimeKey, RuntimeInstance<any, P>>,
      runtimeProvider: ReturnType<typeof useRuntimeProvider>,
      options?: EntryBuilderOptions
    ) =>
      (overrides: Partial<RuntimeConfig> = {}) => {
        // if an instance exists, return it, else create it, register it and return it.
        const payload = {
          providerId: provider.id,
          index: provider.index,
          context: provider.module,
          config: overrides,
        };
        if (options?.dryRun) return runtimeApi.createInert(options.stub?.value);
        const method = options?.isolated
          ? runtimeProvider.registerIsolated
          : runtimeProvider.register;
        const instance = method(id, payload);

        // instances.set(context.key, instance);
        const instances = callback(instance);
        return runtimeApi.create(provider.module, instances);
      },
    [runtimeApi, name]
  );

type EntryBuilderOptions = {
  dryRun: boolean;
  isolated: boolean;
  stub: { value: unknown } | undefined;
};

export const useEntryBuilder = <R, C extends React.FC<any>, P>(
  scopeId: ScopeId,
  name: string
) => {
  const createRuntimeApi = useRuntimeApi(scopeId);
  const createApiProxy = useApiProxyFactory<R, P>(createRuntimeApi, name);
  const createPropsProxy = usePropsProxyFactory(name);
  const createRuntime = useRuntimeFactory<R, C, P>(createRuntimeApi, name);

  const currentProps = useStatefulMerger({
    id: null as never,
  } as unknown as Partial<React.ComponentProps<C> & ExtractStaticProps<C>> &
    IdProp);

  return React.useCallback(
    (
      providerEntries: ResolvedProviderEntry<R, C, unknown>[],
      // currentUpstreamModuleMap either comes from dry run ancestor data, componentInstanceApi getModules or is undefined during the first render on-tree. Can be appended using withMock.
      currentUpstreamModuleMap: Map<
        ProviderId,
        Set<RuntimeContext<any>>
      > | null,
      initialProps: Record<string, unknown>,
      registerId: RegisterId,
      runtimeProvider: ReturnType<typeof useRuntimeProvider>,
      snapshot: ReturnType<
        ReturnType<typeof useRuntimeProvider>['getSnapshot']
      > | null,
      options?: Partial<EntryBuilderOptions>
    ) => {
      const mergedOptions = Object.assign(
        {
          dryRun: false,
          stub: undefined,
          isolated: false,
        },
        options
      ) as EntryBuilderOptions;
      // const runtimeProvider = runtimeProviderApi.getSnapshot();
      // collect upstreamModules to register with useComponentInstance. This is very important, because we rely on this data being updated, before we call resolveProviderData on providerTree, which relies on these upstreamModules to traverse upward, and discover dependencies of dependencies.
      const missingUpstream = new Set<RuntimeContext<any>>();
      const upstreamModuleSource = new Map<
        ProviderId,
        Set<RuntimeContext<any>>
      >();

      // initialProps comes from dry run or from the component props.
      currentProps.reset();
      currentProps.update({ id: registerId, ...initialProps } as never);

      // if a provisional buildEntries call preceeded a real buildEntries call, we want to commit the isolated registrations to the public registry, so they are not recreated here.
      // if (!options.dryRun && !options.isolated) {
      //   //* this allows runtimeProvider.getByKey to pick up existing instances from completed isolated builds.
      //   runtimeProvider.commitIsolatedById(registerId);
      // }

      for (const provider of providerEntries.values()) {
        const localUpstream = new Set<RuntimeContext<any>>();

        // TODO: instances is used to refresh hooks like use, useFn, useRun etc, because if any dependency changes, we have to refresh the effects. we have to think about how we keep this stable, because right now any rerender would create a new map.
        const populated = new Map<RuntimeKey, RuntimeInstance<any, any>>();
        if (
          currentUpstreamModuleMap &&
          currentUpstreamModuleMap.has(provider.id) &&
          (provider.type == 'upstream' || provider.type === 'runtime')
        ) {
          // if currentUpstreamModuleMap exists, it means we are in the live tree but have received data from the dry-run and have to recreate an off-tree node. technically, we don't need to do this, because everything renders top to bottom, which means what ever will be injected will already be available, but we might want to use this later to add mocked instances from withMock.
          // we want to keep localUpstream fresh with the actual results of the current build, because the dry run can include the dependencies conditionally, which are no longer part of the current build. That's why don't add to localUpstream. after we return the upstreamModules they are updated through useComponentInstance, so resolveProviderData, can resolve the new tree correctly, to discover dependencies of dependencies.
          for (const module of currentUpstreamModuleMap.get(provider.id)!) {
            const instance = runtimeProvider.getByKey(
              registerId,
              module.key,
              provider.index,
              snapshot
            )[0]!;

            // TODO: find out why sometimes, what is in currentUpstreamModuleMap, is not instantiated, or at least not available. this could have to do with isolated runs maybe?
            if (instance) populated.set(module.key, instance);
          }
        }

        // populate upstream instances
        if (provider.type === 'upstream') {
          let factory = undefined;
          if (provider.module !== undefined) {
            localUpstream.add(provider.module);
            const [instance] = runtimeProvider.getByKey(
              registerId,
              provider.module.key,
              provider.index,
              mergedOptions.isolated || mergedOptions.dryRun ? snapshot : null
            );
            if (instance) {
              populated.set(provider.module.key, instance);
            } else if (mergedOptions.stub) {
              missingUpstream.add(provider.module);
            } else {
              throw new Error(
                `\x1b[38;5;180m💡 Hey, ${provider.module.name} is not available from upstream.\x1b[0m`
              );
            }
            factory = instance
              ? () => createRuntimeApi.create(provider.module!, populated)
              : mergedOptions.stub
                ? () => createRuntimeApi.createInert(mergedOptions.stub!.value)
                : undefined;
          }

          const propsProxy = createPropsProxy(currentProps.get());
          const apiProxy = createApiProxy(
            provider,
            propsProxy,
            (module) => {
              // this happens for each inject() call
              localUpstream.add(module);
              if (!populated.has(module.key)) {
                const [instance] = runtimeProvider.getByKey(
                  registerId,
                  module.key,
                  provider.index,
                  mergedOptions.isolated || mergedOptions.dryRun
                    ? snapshot
                    : null
                );
                if (instance) {
                  populated.set(module.key, instance);
                } else {
                  missingUpstream.add(module);
                }
              }
              // this is injected into runtimeApi hooks to trigger updates if instances change.
              return populated;
            },
            factory,
            mergedOptions
          );
          const maybeProps = provider.fn(apiProxy as never);
          if (maybeProps) {
            currentProps.update(maybeProps);
          }
        }

        if (provider.type === 'runtime') {
          //* forgot why we need to know why instances come from off-tree nodes, but it will be handy at some point.
          const [exists, _] = runtimeProvider.getByKey(
            registerId,
            provider.module.key
          );

          if (exists) {
            populated.set(provider.module.key, exists);
          }
          const factory = !exists
            ? createRuntime(
                registerId,
                provider,
                (instance) =>
                  // returns instances map with the new instance added
                  populated.set(provider.module.key, instance),
                runtimeProvider,
                mergedOptions
              )
            : () => createRuntimeApi.create(provider.module, populated);

          // TODO: initially we used each entry with a function, so currently, it's not taking into account that we want to create entries just for traversal.
          if (provider.fn) {
            const propsProxy = createPropsProxy(currentProps.get());
            const apiProxy = createApiProxy(
              provider,
              propsProxy,
              (module) => {
                localUpstream.add(module);
                if (!populated.has(module.key)) {
                  const [instance] = runtimeProvider.getByKey(
                    registerId,
                    module.key,
                    provider.index
                  );
                  if (instance) {
                    populated.set(module.key, instance);
                  } else {
                    missingUpstream.add(module);
                  }
                }
                return populated;
              },
              factory,
              mergedOptions
            );

            // this call triggers the runtime to be created
            // TODO: figure out why types are misaligned with props using MergeLeft in ProviderFn type
            const maybeProps = provider.fn(apiProxy as never);
            if (maybeProps) {
              currentProps.update(maybeProps);
            }
          } else {
            // in case we don't have a function, we still create the instance, for dependency injection.
            factory();
          }
        }

        if (provider.type === 'props') {
          const newProps = provider.fn(currentProps.get() as never);
          currentProps.update(newProps ?? {});
        }
        // add to upstreamModuleSource, so we can collect upstreamModules per provider at the dry run stage.
        if (provider.type === 'upstream' || provider.type === 'runtime') {
          upstreamModuleSource.set(provider.id, localUpstream);
        }
      }

      return {
        resultProps: currentProps.get(),
        upstreamModuleSource,
        missingUpstream,
      };
    },
    [
      createApiProxy,
      createPropsProxy,
      createRuntime,
      createRuntimeApi,
      currentProps,
    ]
  );
};

function noUpstreamMessage(name: string, prop: unknown) {
  return `[${name}] "${String(
    prop
  )}" is undefined, because components are not rendered upstream in portable scenarios. This may cause inconsistent behavior.`;
}

function invalidDestructure(name: string, prop: unknown) {
  return `[${name}] Invalid destructure "${String(prop)}".`;
}

// from here on every write to proxyState will emit a value on the stream.
