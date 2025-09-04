// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { useIsoLayoutEffect } from 'hooks/common/useIsoLayoutEffect';
import { useStableObject } from 'hooks/common/useStableObject';
import { useComponentTree } from 'hooks/useComponentTree/useComponentTree';
import type { DryRunApi } from 'hooks/useDryRun/factories/DryRunFactory';
import { useDryRunContext } from 'hooks/useDryRun/hooks/useDryRunContext';
import { useDryRun } from 'hooks/useDryRun/useDryRun';
import { useProviderTree } from 'hooks/useProviderTree/useProviderTree';
import { useRuntimeApi } from 'hooks/useRuntimeApi/useRuntimeApi';
import { useRuntimeProvider } from 'hooks/useRuntimeProvider/useRuntimeProvider';
import {
  createTreeFrame,
  type TreeFrameParentNode,
} from 'hooks/useTreeFrame/factories/TreeFrame';
import { TreeFrameContext } from 'hooks/useTreeFrame/hooks/useTreeFrameContext';
import { useTreeFrame } from 'hooks/useTreeFrame/useTreeFrame';
import { useTreeMap } from 'hooks/useTreeMap/useTreeMap';
import {
  ComponentId,
  RegisterId,
  RuntimeKey,
  type RuntimeApi,
  type ProviderEntry as ProviderEntry,
  type RuntimeConfig,
  type RuntimeInstance,
  type DeclarationId,
  type IdProp,
  type ProviderApi,
  type RuntimeApiFactory,
  type Extensible,
  type ExtractProviderProps,
  type ResolvedProviderEntry,
  type ScopeId,
  type RuntimeModule,
} from 'types';
import { combineV5, createIdFactory, type EdgeDataFields } from 'utils/hash';
import { createElement, copyStaticProperties, extractMeta } from 'utils/react';
import { createChildrenSketch } from 'utils/react/children';
import { useDryRunTracker } from '../../../hooks/useDryRun/hooks/useDryRunTracker';
import {
  createSystemContext,
  SystemContext,
  useSystemContext,
} from './hooks/useSystemContext';
import {
  getStaticDryRunId,
  getStaticProviderList,
  hoistDeclarationId,
  hoistDryRunId,
  hoistOriginalComponent,
  hoistProviderList,
} from './utils/static';

export const useApiProxyFactory = <R,>(
  runtimeApi: RuntimeApiFactory<R>,
  name: string
) =>
  React.useCallback(
    (
      entry: ProviderEntry<R, any, unknown> & { type: 'runtime' | 'upstream' },
      instances: Map<RuntimeKey, RuntimeInstance<any>>,
      factory: (overrides?: Partial<RuntimeConfig>) => RuntimeApi<R>,
      propsProxy: ProviderApi<R>['props']
    ) => {
      return new Proxy<ProviderApi<R>>({} as never, {
        get(_, prop) {
          if (entry.type === 'runtime') {
            if (prop === 'runtime') {
              return factory();
            }
            if (prop === 'configure') {
              return factory;
            }
          }
          if (prop === 'inject') {
            return (module: RuntimeModule<any>) => {
              return runtimeApi.create(module, instances);
            };
          }
          if (prop === 'props') {
            return propsProxy;
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
      id: RegisterId,
      entry: ResolvedProviderEntry<R, C, unknown> & {
        type: 'runtime';
      },
      instances: Map<RuntimeKey, RuntimeInstance<any>>,
      callback: (instance: RuntimeInstance<any>) => void
    ) =>
      (overrides: Partial<RuntimeConfig> = {}) => {
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

// Accumulates and merges props across renders for the component.
const useStatefulMerger = <T extends Extensible<Record<string, unknown>>>(
  initial: T
) => {
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
  scopeId: ScopeId,
  runtimeProvider: ReturnType<typeof useRuntimeProvider>,
  name: string
) => {
  const createRuntimeApi = useRuntimeApi(scopeId);
  const createApiProxy = useApiProxyFactory<R>(createRuntimeApi, name);
  const createPropsProxy = usePropsProxyFactory(name);
  const createRuntime = useRuntimeFactory<R, C>(
    runtimeProvider,
    createRuntimeApi,
    name
  );

  const currentProps = useStatefulMerger({
    id: null as never,
  } as unknown as Partial<React.ComponentProps<C> & ExtractProviderProps<C>> &
    IdProp);

  return React.useCallback(
    (
      entries: Map<RegisterId, ResolvedProviderEntry<R, C, unknown>[]>,
      instances: Map<RuntimeKey, RuntimeInstance<any>>
    ) => {
      // For each RegisterId, set id in currentProps and process its entries
      for (const [regId, entryArr] of entries.entries()) {
        currentProps.reset();
        currentProps.update({ id: regId } as never);
        for (const entry of entryArr) {
          // populate upstream instances
          if (entry.type === 'runtime' || entry.type === 'upstream') {
            for (const module of entry.upstreams) {
              const { context } = module;
              const instance = runtimeProvider.getByKey(
                regId,
                context.key,
                entry.index
              );
              if (instance) {
                if (!instances.has(context.key)) {
                  instances.set(context.key, instance);
                }
              } else {
                throw new Error(
                  `[${name}] Runtime instance for upstream "${context.key.toString()}" not found. Did you use withMock or withAutoMock in your test?`
                );
              }
            }
            // const { context } = entry.module;
            // const instance = runtimeProvider.getByKey(
            //   regId,
            //   context.key,
            //   entry.index
            // );
            // if (instance) {
            //   instances.set(context.key, instance);
            // } else {
            //   throw new Error(
            //     `[${name}] Runtime instance for upstream "${context.key.toString()}" not found. Did you use withMock or withAutoMock in your test?`
            //   );
            // }
          }

          if (entry.type === 'runtime') {
            const exists = runtimeProvider.getByKey(
              regId,
              entry.module.context.key
            );
            const factory = !exists
              ? createRuntime(regId, entry, instances, (instance) => {
                  instances.set(entry.module.context.key, instance);
                })
              : () => createRuntimeApi.create(entry.module, instances);

            // TODO: initially we used each entry with a function, so currently, it's not taking into account that we want to create entries just for traversal.
            if (entry.fn) {
              const propsProxy = createPropsProxy(currentProps.get());
              const apiProxy = createApiProxy(
                entry,
                instances,
                factory,
                propsProxy
              );

              // this call triggers the runtime to be created
              // TODO: figure out why types are misaligned with props using MergeLeft in ProviderFn type
              const maybeProps = entry.fn(apiProxy as never);
              if (maybeProps) {
                currentProps.update(maybeProps);
              }
            } else {
              // in case we don't have a function, we still create the instance, for dependency injection.
              factory();
            }
          }

          if (entry.type === 'props') {
            const newProps = entry.fn(currentProps.get() as never);
            currentProps.update(newProps ?? {});
          }
        }
      }
      return currentProps.get();
    },
    [
      createApiProxy,
      createPropsProxy,
      createRuntime,
      createRuntimeApi,
      runtimeProvider,
      name,
      currentProps,
    ]
  );
};

export function createSystem<R, C extends React.FC<any>>(
  declarationId: DeclarationId,
  Component: C,
  target: React.FC<any>,
  name: string,
  provider?: ProviderEntry<R, C>,
  dryRunIdArg?: ScopeId
) {
  const createId = createIdFactory(declarationId);
  const Wrapper: React.FC<Partial<IdProp & React.ComponentProps<C>>> = (
    props
  ) => {
    const hasRun = React.useRef(false);
    const disposed = React.useRef(false);
    const dryRunContext = useDryRunContext();
    const scopeId = dryRunContext?.scopeId ?? ('live' as ScopeId);
    const frame = useTreeFrame();

    // cast to scopeId because if it's null, we want to use the current dryRunId
    const dryRunId = dryRunIdArg ?? getStaticDryRunId(Component);

    // obtain system context or create (at the root)
    const systemContext =
      useSystemContext() ??
      createSystemContext(scopeId, dryRunId, dryRunContext ? 'dry' : 'live');

    // obtain a reference to the dryrun api, which is used by providerTree, to delegate lookups for unresolved providers.
    const dryRunApi = useDryRun(systemContext.dryRunId as ScopeId) as
      | DryRunApi
      | undefined;

    // this is the deterministic id, used to match dry run candidates
    const componentId = React.useMemo(
      () => createId.baseId(props.id ?? '') as ComponentId,
      [props.id]
    );

    // returns null for unique ids (count 0) to allow rehydration on uniquely identifiable edges.
    const salt = frame.useSalt(
      componentId,
      props.id ? { userId: props.id } : {}
    );

    // unique identifier per component instance, used to register runtime instances
    const registerId = React.useMemo(
      () =>
        createId.withTrail(
          frame.parent.cumSig,
          props.id ?? '',
          salt
        ) as RegisterId,
      [props.id, frame.parent.cumSig, salt]
    );

    // calculate how distinguishable children are, for matching purposes.
    const childrenSketch = React.useMemo(
      () => createChildrenSketch(props.children, 5),
      [props.children]
    );

    // childFrame needs to be stable unlike frame, because frame is pulling upstream and childframe is pushing downstream.
    const childFrame = React.useMemo(() => {
      const parentNode: TreeFrameParentNode = {
        declarationId,
        registerId,
        childrenSketch,
        cumSig: combineV5(frame.parent.cumSig, declarationId, registerId),
      };
      const dryRunMeta = dryRunContext
        ? { parentHit: dryRunContext.targetId === declarationId }
        : undefined;

      return createTreeFrame(frame, parentNode, dryRunMeta);
      // TODO: think through, what happens if frame is not stable, and what the consequences are for childFrame being unstable, as this creates a waterfall.
    }, [frame, registerId, childrenSketch, dryRunContext]);

    // tracks child/parent and parent/children relations between registerIds.
    const treeMap = useTreeMap(
      scopeId,
      registerId,
      frame.parent.registerId as unknown as RegisterId
    );

    // uses treeMap to resolve parent ids to obtain parent declaration ids
    const componentTree = useComponentTree(scopeId, treeMap);

    // uses componentTree to map registerIds to declaration ids to obtain providers. Delegates to dryRunApi to resolve unresolved providers.
    const providerTree = useProviderTree(
      scopeId,
      treeMap,
      componentTree,
      dryRunApi
    );

    // uses treeMap to resolve upstream runtime instances using getByKey
    const runtimeProvider = useRuntimeProvider(scopeId, registerId, treeMap);

    // merges static providers from previous hocs with the local one.
    const localEntries = getStaticProviderList<C, R>(
      Component,
      provider ? [provider] : []
    );

    if (!hasRun.current) {
      if (frame.depth === 0) {
        const self = { declarationId, componentId, registerId, childrenSketch };
        //* this must be executed before providerTree.resolveProviders
        dryRunApi?.promoteByRoot(self);
      }
      if (frame.depth === 1) {
        // TODO: check if we are the first descendent of the root and if so call dryRunApi?.promoteByFirstDescendent. We might be able to check frame.seq.size because it's always zero at the first descendent.
      }

      // relies on tree map registration
      componentTree.register(registerId, declarationId);
      providerTree.register(
        declarationId,
        frame.parent.declarationId ?? null,
        localEntries
      );
      // console.log(
      //   props.id,
      //   scopeId,
      //   name,
      //   registerId,
      //   declarationId,
      //   frame
      // );
    }

    // obtain reference to the tracker for candidate tracking during dry runs.
    const tracker = useDryRunTracker(scopeId, componentTree);

    const firstRender = !hasRun.current;
    React.useLayoutEffect(() => {
      // this runs bottom up, after the dry run gate has short circuited, or when reaching the leaf.
      const noDescendent = childFrame.seq.size === 0;
      // seq.size === 0 means no descendants, so we are the target
      if (
        systemContext.mode === 'dry' &&
        firstRender &&
        (frame.dryRunMeta?.parentHit || noDescendent)
      ) {
        const self = {
          userId: props.id,
          declarationId,
          componentId,
          registerId,
          childrenSketch: createChildrenSketch(props.children, 5),
        };
        tracker.registerCandidate(
          (noDescendent ? self : frame.parent) as EdgeDataFields,
          frame.depth,
          noDescendent ? null : self
        );
      }
      //* we deliberately avoid deps here, to avoid registering candidates unexpectedly. In this case, this is safe, as long as props.id doesn't change between renders, but since we call unmount immediately on dry runs, and rely on the componentId for matching, this is ok.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 4) dev duplicate instId check (same parent+decl)
    // if (process.env.NODE_ENV !== 'production') {
    //   const k = devSeenKey(frame.parent.cumHash ?? ('root' as any), declId, instId);
    //   const first = devSeenCheck(frame.scopeId, k);
    //   if (!first) {
    //     // eslint-disable-next-line no-console
    //     console.warn(`[react-runtime] duplicate instId "${instId}" for decl "${declId}" under same parent`);
    //   }
    // }

    // 5) dry-run gating (optional)
    // Epoch for this mount of the wrapper
    // const epochRef = React.useRef<number | null>(null);
    // if (frame.mode === 'dry' && epochRef.current == null && frame.targetEdge != null) {
    //   epochRef.current = dryRunGate.begin(frame.scopeId, frame.targetEdge);
    // }
    // React.useLayoutEffect(() => {
    //   return () => {
    //     if (epochRef.current != null) {
    //       dryRunGate.end(frame.scopeId, epochRef.current);
    //       epochRef.current = null;
    //       if (process.env.NODE_ENV !== 'production') devSeenClear(frame.scopeId);
    //     }
    //   };
    // }, [frame.scopeId]);

    // if (frame.mode === 'dry') {
    //   const isTarget = dryRunGate.mark(frame.scopeId, eSig);
    //   const prune = dryRunGate.shouldPrune(frame.scopeId);
    //   if (prune && !isTarget) return null;
    //   if (isTarget) return null; // stop at target
    // }

    //* We need a method that takes a set of runtime keys and returns a map with runtime instances, using useSyncExternalStore. This way we can compare runtime ids, between getSnapshot calls, to return a stable map. When ids change, the component will re-render, which allows upstream fast refresh, to update downstream components that depend on upstream runtimes. In order to make this happen, runtimeRegistry, should use this method to register the component id under each runtime id associated with the provided key.

    const needsReconstruction = React.useRef(
      localEntries.some((item) => {
        if (item.type === 'upstream') {
          return item.upstreams.some((module) => {
            const { context } = module;
            const instance = runtimeProvider.getByKey(registerId, context.key);
            return !instance;
          });
        }
      })
    );

    const targetEntries = needsReconstruction.current
      ? providerTree.resolveProviders(registerId, (options) => {
          // this is the registration part for off-tree providers
          treeMap.update(options.descRegId, options.ghostId);
          treeMap.register(
            options.ghostId,
            options.ascRegId ?? ('__ROOT__' as unknown as RegisterId)
          );
          componentTree.register(options.ghostId, options.declId);
          providerTree.register(
            options.declId,
            options.ascDeclId ?? null,
            options.providers
          );
        })
      : (() => {
          const map = new Map<
            RegisterId,
            ResolvedProviderEntry<any, any, unknown>[]
          >();
          map.set(registerId, localEntries);
          return map;
        })();

    // This is the main entry point for the system.
    const buildEntries = useEntryBuilder<R, C>(scopeId, runtimeProvider, name);

    // TODO: we should have separate instance maps for each level with offtree reconstruction
    const instances = React.useMemo(
      () => new Map<RuntimeKey, RuntimeInstance<any>>(),
      []
    );

    //* this builds the entries and registers them in the provider tree.
    const resultProps = buildEntries(targetEntries, instances);

    // TODO: think about cleaning up after aborted renders in the maps and where we want to do this. do we want multiple queueMicrotask calls or together in one place?
    queueMicrotask(runtimeProvider.gcUnpromoted);

    // TODO: make sure we clean up even if effect cleanup doesn't run, since our first render has side effects.
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
    }, []);

    hasRun.current = true;
    const mergedProps = Object.assign({}, resultProps, props);
    const children =
      createElement(target, mergedProps as never) ??
      (props.children as React.ReactNode) ??
      null;

    // TODO: use needsReconstruction to render <ReconstructionComponent /> for each level that's off-tree. We might need to return these components from buildEntries and use useMemo to obtain stable component identities, across rerenders.
    const element = (
      <TreeFrameContext.Provider value={childFrame}>
        {children}
      </TreeFrameContext.Provider>
    );
    return frame.depth === 0 ? (
      <SystemContext.Provider value={systemContext}>
        {element}
      </SystemContext.Provider>
    ) : (
      element
    );
  };
  return Wrapper;
}

export const propagateSystem = <C extends React.FC<any>>(
  declarationId: DeclarationId,
  dryRunId: ScopeId | null,
  Component: React.FC<any>,
  Wrapper: C,
  target: React.FC<any>,
  localProviders: ProviderEntry<any, any>[],
  targetName: string
) => {
  const meta = extractMeta(Component);
  const Memo = React.memo(Wrapper);
  Memo.displayName = targetName;

  copyStaticProperties(meta, Memo);
  hoistOriginalComponent(Memo, target);
  hoistDeclarationId(Memo, declarationId);
  // this happens only at the root, so we can prepend withProviderScope with other hocs.
  if (dryRunId) hoistDryRunId(Memo, dryRunId);
  hoistProviderList(Memo, localProviders as React.ComponentProps<C>);

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
