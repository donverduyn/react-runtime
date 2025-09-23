// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { useIsoLayoutEffect } from '@/hooks/common/useIsoLayoutEffect';
import { useLayoutEffectOnce } from '@/hooks/common/useLayoutEffectOnce';
import { useComponentInstance } from '@/hooks/useComponentInstance/useComponentInstance';
import type { DryRunCandidateAncestor } from '@/hooks/useDryRun/factories/DryRunCandidate';
import {
  useDryRunContext,
  useDryRun,
  useDryRunTracker,
} from '@/hooks/useDryRun/useDryRun';
import { useProviderTree } from '@/hooks/useProviderTree/useProviderTree';
import { useRuntimeProvider } from '@/hooks/useRuntimeProvider/useRuntimeProvider';
import {
  useTreeFrame,
  TreeFrameContext,
  createTreeFrame,
  type TreeFrameParentNode,
} from '@/hooks/useTreeFrame/useTreeFrame';
import { useTreeMap } from '@/hooks/useTreeMap/useTreeMap';
import { tryFnSync } from '@/utils/function';
import { combineV5, createIdFactory, type EdgeDataFields } from '@/utils/hash';
import { combineSetsFromMap, mergeSetsFromMaps } from '@/utils/map';
import {
  createElement,
  copyStaticProperties,
  extractMeta,
  createChildrenSketch,
} from '@/utils/react';
import {
  ComponentId,
  RegisterId,
  type ProviderEntry as ProviderEntry,
  type DeclarationId,
  type IdProp,
  type ScopeId,
  type ProviderId,
  type RuntimeContext,
} from 'types';
import { OffTreeContainer } from './components/OffTreeContainer';
import { OffTreeNode } from './components/OffTreeNode';
import { RenderContainer } from './components/RenderContainer';
import { RUNTIME_STUBS } from './constants';
import { useEntryBuilder } from './hooks/useEntryBuilder';
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

export function CreateSystem<R, C extends React.FC<any>>(
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
    const { children, ...propsWithoutChildren } = props;
    const hasRun = React.useRef(false);
    const disposed = React.useRef(false);
    const dryRunContext = useDryRunContext();
    const scopeId = dryRunContext?.scopeId ?? ('live' as ScopeId);
    const parentFrame = useTreeFrame();
    const dryRunApi = useDryRun();

    // either pick up directly from the current hoc, or from the static property, if a previous hoc was responsible registering the dry run. Note that inside the dry run itself, nobody ever sets the dryRunId, unless withProviderScope is used in the composition of a descendent, but this is not intended usage, as withProviderScope is designed to recompose in tests or stories, not in the actual app.
    const dryRunId = dryRunIdArg ?? getStaticDryRunId(Component);

    // obtain system context or create (at the root). this makes all properties available downstream.
    const systemContext =
      useSystemContext() ??
      createSystemContext(scopeId, dryRunId, dryRunContext ? 'dry' : 'live');

    // this is the deterministic id, used to match dry run candidates
    const componentId = React.useMemo(
      () => createId.baseId(props.id ?? '') as ComponentId,
      [props.id]
    );

    // returns null for unique ids (count 0) to allow rehydration on uniquely identifiable edges.
    const salt = parentFrame.useSalt(
      componentId,
      props.id ? { userId: props.id } : {}
    );

    // unique identifier per component instance, used to register runtime instances
    const registerId = React.useMemo(
      () =>
        createId.withTrail(
          parentFrame.parent.cumSig,
          props.id ?? '',
          salt
        ) as RegisterId,
      [props.id, parentFrame.parent.cumSig, salt]
    );

    // calculate how distinguishable children are, for matching purposes.
    const childrenSketch = React.useMemo(
      () => createChildrenSketch(children, 5),
      [children]
    );

    // frame needs to be stable, because it triggers waterfalls in child frames.
    const frame = React.useMemo(() => {
      const parentNode: TreeFrameParentNode = {
        declarationId,
        registerId,
        childrenSketch,
        cumSig: combineV5(parentFrame.parent.cumSig, declarationId, registerId),
      };
      const dryRunMeta = dryRunContext
        ? { parentHit: dryRunContext.targetId === declarationId }
        : undefined;

      return createTreeFrame(parentFrame, parentNode, dryRunMeta);
      // TODO: is this safe to use these deps? childrenSketch can change on every render.
    }, [parentFrame, registerId, childrenSketch, dryRunContext]);

    // tracks child/parent and parent/children relations between registerIds.
    // TODO: remove implicit registration.
    const treeMap = useTreeMap(
      scopeId,
      registerId,
      parentFrame.parent.registerId as unknown as RegisterId
    );

    // maps register ids to declaration ids and upstream modules
    const componentInstanceApi = useComponentInstance(scopeId);

    // uses componentTree to map registerIds to declaration ids to obtain providers. Delegates to dryRunApi to resolve unresolved providers.
    const providerTree = useProviderTree(
      scopeId,
      treeMap,
      componentInstanceApi
    );

    if (!hasRun.current) {
      hasRun.current = true;
      if (
        frame.depth === 0 &&
        systemContext.mode === 'live' &&
        systemContext.dryRunId !== null
        // this means we are in the portable root, post dry run.
      ) {
        const self = {
          props: propsWithoutChildren,
          declarationId,
          componentId,
          registerId,
          childrenSketch,
        };

        const dryRun = dryRunApi.getInstance(systemContext.dryRunId);
        dryRun.promoteByRoot(self); // we promote the root here, so we can filter candidates based on the root props and component id. After this, we can use getRootAncestors and resolveProviderData to obtain the relevant data for reconstructing the tree.

        //* registers everything off-tree once for traversal. Note that off-tree nodes can override this data when modules change in the respective OffTreeNode instances, but since we have to traverse before we can build (and register), we register here upfront once.

        //* it is important to note that we don't register anything off-tree in the treeMap, because we use the treeMap to determine which modules are available on-tree during traversal in ProviderTree.resolveProviderData.

        const rootAncestors = providerTree.getRootAncestors(dryRun);
        rootAncestors.forEach((ancestor) => {
          componentInstanceApi.register(
            ancestor.id,
            ancestor.declId,
            ancestor.upstreamModules
          );

          // register static providers
          providerTree.register(ancestor.declId, ancestor.localProviders);
        });

        // for the portable root, we register under its own registerId, since it is referenced through treeMap, and need to resolve it during traversal.
        const root = dryRun.getRoot();
        componentInstanceApi.register(
          registerId,
          declarationId,
          root.upstreamModules
        );
        // register static providers
        providerTree.register(declarationId, root.localProviders);
      }
      if (parentFrame.depth === 1) {
        // TODO: check if we are the first descendent of the root and if so call dryRunApi?.promoteByFirstDescendent. We might be able to check frame.seq.size because it's always zero at the first descendent.
      }
    }

    // merges static providers from previous hocs with the local one.
    const localProviders = getStaticProviderList<C, R>(
      Component,
      provider ? [provider] : []
    );

    // Inside this last sibling, we also notify OffTreeContainer at the root to spawn the same OffTreeNode components (by merging the results of resolveProviders inside OffTreeContainer, with the result of the notifier, here we can rely on the combined ancestors of the candidate chains). We also remove the locally spawned OffTreeNode components afterwards.

    // since the treeMap is always up to date as we register at initial render, we can rely on this information to sort the results of resolveProviders and the external store through register ids, to manage the container into a single array to render the OffTreeNode components, such that all instances are always available, considering any later conditional offtree inject calls or late subtree mounts might need it.

    // use the target modules of each candidate to run resolveProviders before the portable root mounts, to validate early and optionally pick the canonical candidate based on the most levels/combined canonical result.

    // use the candidate it's modules, to pre-spawn OffTreeNode components at the root and then run buildEntries in the last sibling of OffTreeNode, so it has access to all instances.

    // notifier should keep a map that tracks the amount of subscribers for each off-tree node, so it can remove unused nodes when the amount reaches zero, based on its configuration. a map that is keyed with declId and has a set of registerIds as value should be sufficient, because we can obtain the other information at the root for ordering since the treeMap has already run by the time notifier is called, as calling the notifier is the last step in the last sibling, and disables the OffTreeNode locally spawned after notification, so the root can take over.

    // consider using runtime modules, to instantiate standalone runtimes when they are not available in the tree, so people can inject the same runtime module in different subtrees, without attaching it to a common ancestor. This let's people choose whether they want to attach instances to components or not, because sometimes you want truly global instances, but not pollute the root, just because you want to talk between to subtrees. It't totally up to the user though to decide, because they can also rely on an event bus and then extend a pubsub stream in both subtrees, for a more decoupled approach.

    // we might want to use withRuntime specifically for standalone runtime modules, so we are not associating them with upstream usage and the ability to inject them through inject(). this makes it clear that standalone does not come from upstream, but from outside. the only question remains, should we let users provide a standalone property to config, or to the runtime module options during declaration. it would be more transparent to provide this as part of the configuration so it's immediately clear that it's not instantiating on the component itself.

    // return offTree boolean from runtimeProvider.getByKey, using second value in tuple, and use this inside resolveProviderData, to mark unresolvedModules? or is this not needed because we look at the registered runtime providers in providerTree based on treeMap which will never include off-tree records.

    // always return the DryRunCandidateAncestor belonging to the portable root, separately from the map, because the map is used to render OffTreeNode components, but we need the props of the portable root to avoid divergence. Return a tuple from resolveProviderData with the portable root ancestor first and the map second.

    // think about always using a container in system, because conside using useRun with a stream which would rerender system on every item. maybe we can just collect all the runtime api calls and only process in the container.

    // TODO: think about how we can reduce the amount of dry run related hooks to be called when we don't use them in a live tree.
    // obtain reference to the tracker for candidate tracking during dry runs.
    const tracker = useDryRunTracker(scopeId, treeMap);

    useLayoutEffectOnce(() => {
      //* note that anything we close over becomes stale the moments the references change, but since we are only interesting in calling this once on mount, that's correct.

      //* even though props.id could theoretically change, if it does, we lose the identity to hydrate the runtimes anyway, and it would require reinstantation on all descendents, since we use a cumulative signature for the register id.

      // this runs bottom up, after the dry run gate has short circuited, or when reaching the leaf.
      const noDescendent = frame.seq.size === 0;
      // seq.size === 0 means no descendants, so we are the target
      if (
        systemContext.mode === 'dry' &&
        (parentFrame.dryRunMeta?.parentHit ||
          (frame.dryRunMeta?.parentHit && noDescendent))
      ) {
        const self = {
          props: propsWithoutChildren as Record<string, unknown>,
          userId: props.id,
          declarationId,
          componentId,
          registerId,
          childrenSketch: createChildrenSketch(props.children, 5),
        };

        tracker.registerCandidate(
          (noDescendent ? self : parentFrame.parent) as EdgeDataFields,
          parentFrame.depth,
          noDescendent ? null : self
        );
      }
    });

    // We need a method that takes a set of runtime keys and returns a map with runtime instances, using useSyncExternalStore. This way we can compare runtime ids, between getSnapshot calls, to return a stable map. When ids change, the component will re-render, which allows upstream fast refresh, to update downstream components that depend on upstream runtimes. In order to make this happen, runtimeRegistry, should use this method to register the component id under each runtime id associated with the provided key.

    // don't forget to merge the mocked props with the actual props passed into the target component.

    // consider running resolveProviderData first at the portable root, using the upstreamModules from the dry run candidate, because normally we can only know the upstream modules on-tree after running buildEntries, but buildEntries can only run if we have the dependencies ready, but the dependencies can only be ready if we know what to resolve off-tree with OffTreeNode

    // consider pulling the first value of a stream emission synchronously into ref and then use the ref to set the initialvalue of useState, after which you call setState for any updates. this way we don't have to abort renders by calling setState repeatedly on mount. also think about a way to filter updates with shallow equal, because right now the idea is to ahve a single SubscriptionRef that holds all props, but in practice you only want to listen to updates on a single prop, we might want to create a service that allows you request a subscriptionref for a specific prop.

    // consider using a fallback candidate when a provided root for the provider scope has no matches and use the root as the sole ancestor. Then try to resolve all dependencies and if it succeeds use it. otherwise throw. do not override props, since we have no structural match to start from. This automatically throws if there are intermediary nodes that are missing, which is good, because it avoids ambiguity between ancestor paths, and which was "used" in this case, so the mental model stays locked into structural matching. The narrative could be trying to resolve as direct descendent (which is what we actually do).

    // - ✅ Traversal currently not working as intended In providerTree, because it relies on stale data off-tree for traversal from the dry run.

    // - Multimemostore on buildEntries level, to avoid different amount of hooks from dynamic runtimeApi usage

    // - External store to track OffTreeNode instances to recreate at the root and manage descendent OffTreeContainer instances (pruning OffTreeNode instances to avoid running effects in two places)

    // - ✅ Finishing logic in OffTreeNode

    // - Fix typings, to show error when mismatched overridden prop

    // consider what we want to do if constructing a node after a stubbed frun fails, since it runs in isolated now. what should happen afterwards, and also what should happen if a missing dependency pops up post mount from that point. does it have the ability to recurse from there, which was the indended plan.

    // discover why fast refresh fails on certain files in the project and shows a dependencies missing error.

    const nullableDryRunInstance =
      systemContext.dryRunId !== null
        ? dryRunApi.getInstance(systemContext.dryRunId)
        : null;
    // uses treeMap to resolve upstream runtime instances using getByKey
    const runtimeProviderApi = useRuntimeProvider(
      scopeId,
      registerId,
      treeMap,
      providerTree,
      nullableDryRunInstance
    );

    // TODO: think about cleaning up after aborted renders in the maps.
    queueMicrotask(runtimeProviderApi.gcUnpromoted);

    useIsoLayoutEffect(() => {
      // TODO: promote and keepalive generally need to happen together, because it acknowledges that what was instantiated can be kept and when remounted can be kept alive, so we might want to combine these.
      runtimeProviderApi.promote();
      runtimeProviderApi.keepAlive();
      return runtimeProviderApi.unregister;
    }, []);

    const buildEntries = useEntryBuilder<
      R,
      C,
      Partial<IdProp & React.ComponentProps<C>>
    >(scopeId, name);

    //* from here on we start returning jsx.
    //* we need to distinguish between three modes.

    //* 1. DRY MODE PRUNING, in which case we return null when parentHit is true or without descendents and we are the target, otherwise fallback to 2.

    // const dryRunGate = useDryRunGate()
    // if(systemContext.mode === 'dry' && frame.depth === 0){

    // }
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

    //* 2. LIVE TREE (WITHOUT DRYRUN API) | DRY MODE WITHOUT PRUNING, in which case we just build and return
    if (systemContext.dryRunId === null) {
      const { resultProps, upstreamModuleSource } = buildEntries(
        localProviders,
        // already set at begin in live tree but not in dry run.
        componentInstanceApi.getUpstreamById(registerId),
        propsWithoutChildren,
        registerId,
        runtimeProviderApi,
        null
      );

      if (systemContext.mode === 'dry') {
        // TODO: register upstream modules, providerPayloads, original props, and localProviders in dryRunTracker using registerAncestor under registerId
        tracker.registerAncestor({
          id: registerId,
          declId: declarationId,
          props: propsWithoutChildren, // use original props
          upstreamModules: upstreamModuleSource, // from buildEntries
          localProviders,
        });
      }
      // providerTree tracks which runtime modules are instantiated under which declaration ids, so we can look ahead when we resolve providers
      componentInstanceApi.register(
        registerId,
        declarationId,
        upstreamModuleSource
      );
      providerTree.register(declarationId, localProviders);

      const mergedProps = Object.assign({}, props, resultProps, {
        registerId: registerId.substring(0, 3),
      });
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const memoTarget = React.useMemo(() => React.memo(target), []);
      const childrenNode =
        createElement(memoTarget, mergedProps as never) ??
        (children as React.ReactNode) ??
        null;

      const element = (
        <TreeFrameContext.Provider value={frame}>
          {childrenNode}
        </TreeFrameContext.Provider>
      );

      return parentFrame.depth === 0 ? (
        <SystemContext.Provider value={systemContext}>
          {element}
        </SystemContext.Provider>
      ) : (
        element
      );
    }

    //   //* With descendents, there is no upfront data available, which means we have to call buildEntries first and rely on stubbed missing modules, just to obtain the actual upstreamModules. We accept that we might miss certain scenarios like conditional inject based on string comparison, but if this happens, we fall back to instantiating all the remaining modules as the second strategy.

    // maybe if we really push for it, we can obtain property access for each runtime api instance and infer which module requires instantiation just to collect the other modules, but this is borderline creepy, so let's not go there for now.

    //* even though buildEntries can throw, it doesn't register hooks when stubbed, since they are only used with use* hook factories, so it doesn't risk breaking the rules of hooks. However, stubbing happens per case, so instantiation, causes changes in the amount of hooks per render. This is a problem, because we have to assume a stubbed run is required every time.

    // TODO: use createInert to not just stub the return values but also to run the actual effects without memo and lifecycle hooks (when a stubValue/dryRun=true is provided), so the actual buildEntries run without stubValue, can register with the hooks, or rely on the useSyncExternalStore solution, but it wouldn't make sense with a dry run. Well maybe, we shouldn't after all, if we use a multi-memo-store at the buildEntries level anyway, because it would resemble a real buildEntries call more closely, if an OffTreeNode stays alive beyond the first render and during unmount. Even though we do not intend to have intermediate OffTreeNode instances being rerendered, we have to consider that it happens, and therefore we might not want to use fixed values, but we should revisit what's best in terms of useFn etc.

    // TODO: there is another problem with the current approach. consider that the user uses a react hook after the function throws. We catch the throw, but the hook is not registered, and results in different amount of hooks between renders, after the modules are synchronously registered. however, we know that in strict mode the second render happens before the first child render, which means the child can never register something in between the first and second render of the parent, which allows us to run the specific buildEntries again in a child instance instead.

    // TODO: we do currently update the componentInstance api immediately after with upstreamModules, but this doesn't affect the render itself, since we are doing a dry run. For this reason we seem to be safe.

    // TODO: make renderFn/buildFn stable, and allow OffTreeNode to rerender container, so when changes happen in one of them, the props container can re-render too. we can also consider using a different way to trigger a rerender in props container directly.

    //* 3. LIVE TREE WITH DRYRUNAPI (PORTABLE), in which case we need to reconstruct the tree.

    // condition doesn't change over lifecycle of component instance
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const discoveryFn = React.useCallback(
      (
        options: Omit<
          React.ComponentProps<typeof OffTreeNode>,
          'discoveryFn'
        > & {
          snapshot: ReturnType<
            ReturnType<typeof useRuntimeProvider>['getSnapshot']
          >;
        }
      ) => {
        const dryRun = dryRunApi.getInstance(systemContext.dryRunId!);

        // the discovery function is used to discover off-tree nodes to render at each step. we need to support both strategies. the strategy is provided through the arguments object.

        //* OffTreeNode instances with strategy 'use-stub', can potentially break the rules of hooks when they re-render, unless we prevent side effects from changing the results. this is essentially true, for every component that runs with try/catch. we might want to buffer where read from in these places, so a rerender doesn't cause different results, in case it happens before the the actual buildEntries call happens in a recreated OffTreeNode at the root and a rerender causes all descendent OffTreeNodes to unmount.

        if (options.strategy === 'use-stub') {
          const [missing, upstreamModules] = RUNTIME_STUBS.reduce(
            ([set, upstream], stub) => {
              const result = tryFnSync(() =>
                buildEntries(
                  options.localProviders,
                  componentInstanceApi.getUpstreamById(options.registerId),
                  options.nodeProps,
                  options.registerId,
                  options.runtimeProviderApi,
                  options.snapshot,
                  // dryRun option stubs local runtimes and avoids instantiatiom
                  { dryRun: true, stub: { value: stub } }
                )
              );
              return result
                ? [
                    set.union(result.missingUpstream),
                    mergeSetsFromMaps(upstream, result.upstreamModuleSource),
                  ]
                : [set, upstream];
            },
            [
              new Set<RuntimeContext<unknown>>(),
              new Map<ProviderId, Set<RuntimeContext<unknown>>>(),
            ]
          );

          //* PROVISIONAL registration (assuming a user didn't conditionally inject a new module based on a string or number property). If it did, buildEntries will throw next time, and we reconstruct all missing modules based on root ancestors and finally run buildEntries again.

          // register upstreamModules, to fetch second order dependencies from resolveProviderData.
          componentInstanceApi.register(
            options.registerId,
            options.declarationId,
            upstreamModules //<-- this is the important part, that allows us to run traversal on up to date data.
          );

          // PROVISIONAL traversal. we don't want to memoize this call, because the results change based on the modules registered in providerTree AT ANY LEVEL.
          const [resolved] = providerTree.resolveProviderData(
            options.registerId,
            dryRun,
            missing
          );

          return { offTreeMap: resolved, succeeded: missing.size === 0 };
        }

        //* note that options.runtimeProviderApi is an isolated instance for this strategy.
        if (
          options.strategy === 'use-isolated' ||
          options.strategy === 'use-isolated-check'
        ) {
          const result = tryFnSync(() =>
            buildEntries(
              options.localProviders,
              componentInstanceApi.getUpstreamById(options.registerId),
              options.nodeProps,
              options.registerId,
              options.runtimeProviderApi,
              options.snapshot,
              // uses registerIsolated
              { isolated: true }
            )
          );

          //* without provided stubs, buildEntries throws on missing modules, so if result is not undefined, we know it has no missing modules, but we check anyway.
          if (result && result.missingUpstream.size === 0) {
            componentInstanceApi.register(
              options.registerId,
              options.declarationId,
              result.upstreamModuleSource
            );

            //* merge from isolated under this registerId, so we don't have to recreate any instances later on.
            runtimeProviderApi.mergeIsolatedById(options.registerId);
          }
          // clean up side effects for deterministic re-renders.
          // options.runtimeProviderApi.gcIsolated(options.registerId);

          const [resolved] = providerTree.resolveProviderData(
            options.registerId,
            dryRun,
            result ? result.missingUpstream : new Set<RuntimeContext<unknown>>()
          );

          return {
            offTreeMap: resolved,
            succeeded:
              result !== undefined && result.missingUpstream.size === 0,
          };
        }

        if (options.strategy === 'use-all') {
          const ancestors = providerTree.getRootAncestors(dryRun);

          // access list of ancestors/nodes already available. essentially, we can look at upstreamModules in componentInstanceApi and run traversal against it, but it's also provided through props.
          // TODO: also consider nodes not associated with the upstreamModules traversal, since we are pulling ALL ancestors. We can switch a different source of truth for this, once we track nodes themselves in the external store for OffTreeNode replication, because now, we can't easily find out, unless we do a merge on all records in componentInstanceApi, but this is not feasible.

          const [existingNodes] = providerTree.resolveProviderData(
            options.registerId,
            dryRun,
            combineSetsFromMap(
              componentInstanceApi.getUpstreamById(options.registerId)
            )
          );
          const filteredAncestors = ancestors
            .values()
            .reduce(
              (map, ancestor) =>
                !existingNodes.has(ancestor.id)
                  ? map.set(ancestor.id, ancestor)
                  : map,
              new Map<RegisterId, DryRunCandidateAncestor>()
            );
          return { offTreeMap: filteredAncestors, succeeded: true };
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (options.strategy === 'use-public') {
          const result = tryFnSync(() =>
            buildEntries(
              options.localProviders,
              componentInstanceApi.getUpstreamById(options.registerId),
              options.nodeProps,
              options.registerId,
              options.runtimeProviderApi,
              null
            )
          );

          //* without provided stubs, buildEntries throws on missing modules, so if result is not undefined, we know it has no missing modules, but we check anyway.
          if (result && result.missingUpstream.size === 0) {
            componentInstanceApi.register(
              options.registerId,
              options.declarationId,
              result.upstreamModuleSource
            );
          }

          const [resolved] = providerTree.resolveProviderData(
            options.registerId,
            dryRun,
            result ? result.missingUpstream : new Set<RuntimeContext<unknown>>()
          );

          return {
            offTreeMap: resolved,
            succeeded:
              result !== undefined && result.missingUpstream.size === 0,
          };
        }
        return null as never;
      },
      // everything is stable, and we don't want to risk invalidation.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        // buildEntries,
        // componentInstanceApi,
        // dryRunApi,
        // providerTree,
        // systemContext.dryRunId,
      ]
    );

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const offTreeRenderFn = React.useCallback(
      () => {
        const dryRun = dryRunApi.getInstance(systemContext.dryRunId!);
        const root = providerTree.getRoot(dryRun);

        return (
          <OffTreeNode
            key={registerId}
            declarationId={declarationId}
            discoveryFn={discoveryFn}
            localProviders={localProviders}
            registerId={registerId}
            runtimeProviderApi={runtimeProviderApi}
            strategy='use-stub'
            nodeProps={
              //* this makes sure we use the props from the candidate at the root, to avoid divergence.
              frame.depth === 0 ? root.props : propsWithoutChildren
            }
          />
        );

        //* currently we just create all nodes from the traversal, even those already available. we might want to filter based on which nodes are already created, since we are planning to track this information anyway after OffTreeNode mount, for OffTreeContainer signalling and replication. This would mean that after every subsequent rerender, no OffTreeNode components would have to render again, unless new nodes need to be added, but this would in general happen at the root OffTreeNode after replication, not locally.

        //* for now we might want to use componentInstanceApi, but maybe that's not possible because ALL nodes get registered there, so it's not representative. a better thing to do would be to keep track of the nodes in the notifier.

        //* We run a dry run first to obtain fresh upstreamModules, because they can change over time. Initially they are equal to "node.upstreamModules". We read the previously registered upstreamModules from componentInstanceApi, for comparison or fallback when nothing is registered, although we register all off-tree nodes already upfront.
        // TODO: consider triggering subscribers here, because this might result in different traversals downstream.
        // TODO: also consider signaling to the root for replication of OffTreeNode components, since they will disappear here, the moment they are no longer part of the traversal based on the updated upstreamModules in a subsequent render.
        // we don't need to register localProviders, because they are static
        // the first question here is, do we have everything we need or are there missing modules.
        // TODO: think about how we can avoid creating hooks in buildEntries, by injecting a multi memo store instance to use for runtime api instantiation. this way we can safely run buildEntries here.
        //* the risk here is that missing.size, can be larger then 0 in the first render but 0 in the second, which not only means the hooks are not committed, but also that we have a different amount of hooks between renders
        // if there are missing modules obtain all off-tree providers starting from this component given the missing modules and return OffTreeNode components for each of them, with the last OffTreeNode switching to the strategy='use-all', so if the dry run still fails, we can instantiate everything and prune unused modules afterwards.
        //* normally this doesn't happen, because order is already top to bottom here (hence the reverse), so dependencies of dependencies should always be available, unless they are requested through conditionally injected modules post mount.
        // TODO: now the question is, can it still fail here, and the answer is, theoretically YES. if a user conditionally injects off-tree post-mount and second order dependencies are added because of this, trying to call buildEntries on them will usually work, because all upstreamModules are known upfront, but it would have to happen in the catch block by returning OffTreeNode components for each. If they themselves conditionally injected post-mount, they would already have existed, and we wouldn't have thrown here, but it doesn't answer the question how they themselves would resolve the same situation, so this is requires a recursive solution, where we recurse until everything that is missing is resolved. this also means that at any level, a rerender can cause child nodes to be rendered at any depth, and destroyed in the next render, or maybe even after signalling to the root for replication when replication has happened and the hooks are now running at the root in their designated OffTreeNode.
        //* this should never happen, but it can when new dependencies are not fulfilled off-tree. In this case we should warn the user to use a different root for the scope, use withMock, or ensure that there are no missing providers for the injected modules inside their component hierarchy.
        // it can also happen when the stub values didn't catch certain property access patterns, but this is less likely. in this case, we might want to resort to a last resort method that instantiates all missing modules at once, and then prunes unused ones based on the returned modules from buildEntries.
        // we might want to take all the ancestors from the candidate then filter away everything inside upstreamModules and missingModules, create off tree nodes for each of them, and then afterwards, compare the actual modules returned from buildEntries, to prune OffTreeNode components that weren't needed from either missingModules or the remaining modules from here.
        // consider using usePropsContainer with an api to force a rerender in propscontainer on state change. either use useMemo, or use useState to trigger rerenders in OffTreeNode by updating the modules to remove unneeded ones.
        // consider that when postUnmounTTL is zero, fast-refresh would cause a new runtime to be created, but descendents wouldn't get automatically rerendered. if they depend on it.
        // throw new Error(
        //   'Unable to resolve dependencies off-tree. Please ensure all dependencies are available in the tree, or use withMock to mock missing dependencies.'
        // );
        // if dry runs fail, collect all missing modules from dryRunApi/providerTree
        // otherwise use the differing modules
        // instantiate missing modules with child OffTreeNode
        // run buildEntries again in last sibling
        // register in providerTree
        // in case of instantiated missing dependencies, prune unused OffTreeNode components, based on returned modules from buildEntries.
        // notify OffTreeContainer to clone OffTreeNode components at the root
        // disable local OffTreeNode components after notification (without unmounting).
        // TODO: we need to figure which modules already exist, when they are returned from buildEntries, otherwise we now can't filter away in the last resort case.
        //* we return here a map of OffTreeNode components, to meet the requirements, with the last OffTreeNode calling buildEntries again.
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        // componentInstanceApi,
        // discoveryFn,
        // dryRunApi,
        // frame.depth,
        // localProviders,
        // propsWithoutChildren,
        // providerTree,
        // registerId,
        // runtimeProviderApi,
        // systemContext.dryRunId,
      ]
    );

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const renderFn = React.useCallback(
      () => {
        let root = null as DryRunCandidateAncestor | null;
        if (frame.depth === 0 && systemContext.dryRunId) {
          const instance = dryRunApi.getInstance(systemContext.dryRunId);
          root = instance.getRoot();
        }

        // console.log('from RenderContainer', registerId);
        //* final build with all instances available.
        const { resultProps, upstreamModuleSource } = buildEntries(
          localProviders,
          // already set at begin.
          componentInstanceApi.getUpstreamById(registerId),
          Object.assign(
            {},
            propsWithoutChildren,
            // we overwrite props with the props used during dry run, to avoid divergence.
            root ? root.props : {}
          ),
          registerId,
          runtimeProviderApi,
          null
        );

        componentInstanceApi.register(
          registerId,
          declarationId,
          upstreamModuleSource
        );
        providerTree.register(declarationId, localProviders);

        const mergedProps = Object.assign(
          {},
          propsWithoutChildren,
          resultProps,
          // this allows mocking props at the root to avoid divergence.
          frame.depth === 0 ? (root?.props ?? {}) : {}
        );
        const childrenNode =
          createElement(target, mergedProps as never) ??
          (children as React.ReactNode) ??
          null;

        const element = (
          <TreeFrameContext.Provider value={frame}>
            {childrenNode}
          </TreeFrameContext.Provider>
        );
        return frame.depth === 0 ? (
          <SystemContext.Provider value={systemContext}>
            {element}
          </SystemContext.Provider>
        ) : (
          element
        );
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        // buildEntries,
        // children,
        // componentInstanceApi,
        // dryRunApi,
        // frame,
        // localProviders,
        // propsWithoutChildren,
        // providerTree,
        // registerId,
        // runtimeProviderApi,
        // systemContext,
      ]
    );

    return (
      <>
        <OffTreeContainer renderFn={offTreeRenderFn} />
        <RenderContainer renderFn={renderFn} />
      </>
    );
  };
  return Wrapper;
}

export const PropagateSystem = <C extends React.FC<any>>(
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
