// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Merge } from 'type-fest';
import { useIsoLayoutEffect } from 'hooks/common/useIsoLayoutEffect';
import { useStableObject } from 'hooks/common/useStableObject';
import { useComponentTree } from 'hooks/useComponentTree/useComponentTree';
import type { DryRunApi } from 'hooks/useDryRun/factories/DryRunFactory';
import { useDryRunContext } from 'hooks/useDryRun/hooks/useDryRunContext';
import { useDryRun } from 'hooks/useDryRun/useDryRun';
import { useProviderTree } from 'hooks/useProviderTree/useProviderTree';
import { useRuntimeApi } from 'hooks/useRuntimeApi/useRuntimeApi';
import { useRuntimeProvider } from 'hooks/useRuntimeProvider/useRuntimeProvider';
import { createTreeFrame } from 'hooks/useTreeFrame/factories/TreeFrame';
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
  type ExtractStaticProps,
  type ResolvedProviderEntry,
  type ScopeId,
} from 'types';
import { combineV5, createIdFactory, type EdgeDataFields } from 'utils/hash';
import { createElement, copyStaticProperties, extractMeta } from 'utils/react';
import { createChildrenSketch } from 'utils/react/children';
import { useDryRunTracker } from '../../../hooks/useDryRun/hooks/useDryRunTracker';
import { SystemContext, useSystemContext } from './hooks/useSystemContext';
import {
  getStaticDryRunId,
  getStaticProviderList,
  hoistDeclarationId,
  hoistDryRunId,
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
      factory: (overrides?: Partial<RuntimeConfig>) => RuntimeApi<R>
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
      id: RegisterId,
      entry: ResolvedProviderEntry<R, C, unknown> & {
        type: 'runtime' | 'upstream';
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

const usePropsProxyFactory = (name: string) =>
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
  scopeId: ScopeId,
  runtimeProvider: ReturnType<typeof useRuntimeProvider>,
  registerId: RegisterId,
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

  // TODO: consider making initial optional because we have to reset anyway, or reset at the end maybe, but seems bad idea.
  const currentProps = useStatefulMerger({
    id: registerId,
  } as unknown as Merge<
    Partial<React.ComponentProps<C>>,
    ExtractStaticProps<C> & IdProp
  >);

  return React.useCallback(
    (
      entries: Map<RegisterId, ResolvedProviderEntry<R, C, unknown>[]>,
      instances: Map<RuntimeKey, RuntimeInstance<any>>
    ) => {
      // For each RegisterId, set id in currentProps and process its entries
      // Reverse the entries before processing
      const reversedEntries = Array.from(entries.entries()).reverse();
      for (const [regId, entryArr] of reversedEntries) {
        currentProps.reset();
        currentProps.update({ id: regId } as never);
        for (const entry of entryArr) {
          if (entry.type === 'upstream') {
            const { context } = entry.module;
            const instance = runtimeProvider.getByKey(
              regId,
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
            const exists = runtimeProvider.getByKey(
              regId,
              entry.module.context.key
            );
            const factory =
              !exists && entry.type === 'runtime'
                ? createRuntime(regId, entry, instances, (instance) => {
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
  const Wrapper: React.FC<IdProp & Partial<React.ComponentProps<C>>> = (
    props
  ) => {
    const hasRun = React.useRef(false);
    const disposed = React.useRef(false);
    const dryRunContext = useDryRunContext();
    const scopeId = dryRunContext?.scopeId ?? ('live' as ScopeId);
    const frame = useTreeFrame();

    // cast to scopeId because if it is null, we want to use the current dryRunId
    const dryRunId = dryRunIdArg ?? getStaticDryRunId(Component);

    // TODO: think about the api because the provided values are only used at the root, while the context itself is used everywhere else.
    const systemContext = useSystemContext(
      scopeId,
      dryRunId,
      dryRunContext ? 'dry' : 'live'
    );
    const dryRunApi = useDryRun(systemContext.dryRunId as ScopeId) as
      | DryRunApi
      | undefined;

    const componentId = React.useMemo(
      () => createId.baseId(props.id ?? '') as ComponentId,
      [props.id]
    );

    // returns null for unique ids (count 0) to allow rehydration
    const salt = frame.useSalt(
      componentId,
      props.id ? { userId: props.id } : {}
    );

    const registerId = React.useMemo(
      () =>
        createId.withTrail(
          frame.parent.cumSig,
          props.id ?? '',
          salt
        ) as RegisterId,
      [props.id, frame.parent.cumSig, salt]
    );

    const childrenSketch = React.useMemo(
      () => createChildrenSketch(props.children, 5),
      [props.children]
    );

    // childFrame should be stable unlike frame, because frame is pulling upstream and childframe is pushing downstream.
    const childFrame = React.useMemo(
      () =>
        createTreeFrame(
          frame,
          {
            declarationId,
            registerId,
            childrenSketch,
            cumSig: combineV5(frame.parent.cumSig, declarationId, registerId),
          },
          dryRunContext
            ? { parentHit: dryRunContext.targetId === declarationId }
            : undefined
        ),
      [frame, registerId, childrenSketch, dryRunContext]
    );

    const treeMap = useTreeMap(
      scopeId,
      registerId,
      frame.parent.registerId as unknown as RegisterId
    );

    const componentTree = useComponentTree(scopeId, treeMap);
    const providerTree = useProviderTree(
      scopeId,
      treeMap,
      componentTree,
      dryRunApi
    );
    const runtimeProvider = useRuntimeProvider(
      scopeId,
      registerId,
      treeMap,
      componentTree,
      providerTree
    );
    const tracker = useDryRunTracker(scopeId, componentTree);
    const localEntries = getStaticProviderList<C, R>(Component, provider);

    if (!hasRun.current) {
      if (frame.depth === 0) {
        const self = { declarationId, componentId, registerId, childrenSketch };
        //* this must be executed before providerTree.resolveProviders
        dryRunApi?.promoteByRoot(self);
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
        const _ = tracker.registerCandidate(
          (noDescendent ? self : frame.parent) as EdgeDataFields,
          frame.depth,
          noDescendent ? null : self
        );
      }
      // childFrame is stable
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerId, frame, props.children, tracker]);

    const instances = React.useMemo(
      () => new Map<RuntimeKey, RuntimeInstance<any>>(),
      []
    );

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

    const needsReconstruction = localEntries.some((item) => {
      if (item.type === 'upstream') {
        const { context } = item.module;
        const instance = runtimeProvider.getByKey(registerId, context.key);
        return !instance;
      }
    });

    // TODO: move side effects out of resolveProviders
    const targetEntries = needsReconstruction
      ? providerTree.resolveProviders(registerId)
      : (() => {
          const map = new Map<
            RegisterId,
            ResolvedProviderEntry<any, any, unknown>[]
          >();
          map.set(registerId, localEntries);
          return map;
        })();

    // This is the main entry point for the system.
    const buildEntries = useEntryBuilder<R, C>(
      scopeId,
      runtimeProvider,
      registerId,
      name
    );

    // this builds the entries and registers them in the provider tree.
    const resultProps = buildEntries(targetEntries, instances);

    // make sure we clean up even if effect cleanup doesn't run, since our first render has side effects.
    // TODO: think about cleaning up after aborted renders in the maps and where we want to do this. do we want multiple queueMicrotask calls or together in one place?
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

    hasRun.current = true;
    const mergedProps = Object.assign({}, resultProps, props);
    const children =
      createElement(target, mergedProps as never) ??
      (props.children as React.ReactNode) ??
      null;

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
  allProviders: ProviderEntry<any, any>[],
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
