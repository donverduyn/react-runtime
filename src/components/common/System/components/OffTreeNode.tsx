import * as React from 'react';
import type { DryRunCandidateAncestor } from 'hooks/useDryRun/factories/DryRunCandidate';
import type { useRuntimeProvider } from 'hooks/useRuntimeProvider/useRuntimeProvider';
import type { DeclarationId, RegisterId, ResolvedProviderEntry } from 'types';

type DiscoveryFnResult = {
  offTreeMap: Map<RegisterId, DryRunCandidateAncestor>;
  succeeded: boolean;
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly localProviders: ResolvedProviderEntry<any, any, unknown>[];
  readonly registerId: RegisterId;
  readonly declarationId: DeclarationId;
  readonly nodeProps: Record<string, unknown>;
  // readonly options?: { dryRun: boolean; unresolvedStub: unknown } | undefined;
  readonly strategy:
    | 'use-stub'
    | 'use-all'
    | 'use-isolated'
    | 'use-isolated-check'
    | 'use-public';
  // TODO: think about how we want to access dependencies, instead of passing through props.
  readonly runtimeProviderApi: ReturnType<typeof useRuntimeProvider>;
  // readonly snapshot: ReturnType<
  //   ReturnType<typeof useRuntimeProvider>['getSnapshot']
  // >;
  readonly discoveryFn: (
    buildFnArgs: Omit<Props, 'discoveryFn'> & {
      snapshot: ReturnType<
        ReturnType<typeof useRuntimeProvider>['getSnapshot']
      >;
    }
  ) => DiscoveryFnResult;
  // readonly onChange?: (data: { missing: Set<RuntimeModule<unknown>> }) => void;
  readonly onInitialized?: () => void;
  readonly renderFn?: (props: Omit<Props, 'renderFn'>) => React.ReactNode;
};

export const OffTreeNode = React.memo(
  function OffTreeNode(props: Props) {
    const { discoveryFn, ...rest } = props;

    //* use isolated runtime providers, to avoid different results between re-renders, except for use-public, because it always executes the same code. For example, in use-stub, it's possible for a function to throw, missing potential hook registrations. If between re-renders, the available dependencies change, suddenly the function passes, and the rules of hooks are broken.
    const snapshot = React.useMemo(
      () => props.runtimeProviderApi.getSnapshot(),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    // const id = React.useId();

    // console.log(props.registerId, props.strategy, id, snapshot);
    const discovery = props.discoveryFn(Object.assign({}, rest, { snapshot }));

    //* after stubbed run
    if (props.strategy === 'use-stub') {
      return (
        <>
          {Array.from(discovery.offTreeMap.values())
            .reverse()
            .map((ancestor) => (
              // use use-isolated, assuming everything is available from the previously rendered nodes. If not, we have a use-all fallback. This happens when a new dependency is injected post mount.
              <OffTreeNode
                key={ancestor.id}
                declarationId={ancestor.declId}
                discoveryFn={props.discoveryFn}
                localProviders={ancestor.localProviders}
                nodeProps={ancestor.props}
                registerId={ancestor.id}
                runtimeProviderApi={props.runtimeProviderApi}
                strategy='use-isolated'
              />
            ))}
          {/* the goal here is to validate if we actually have all dependencies we need now, by running a real but isolated buildEntries call using the 'use-isolated' strategy */}
          <OffTreeNode
            key={props.registerId}
            declarationId={props.declarationId}
            discoveryFn={props.discoveryFn}
            localProviders={props.localProviders}
            nodeProps={props.nodeProps}
            registerId={props.registerId}
            runtimeProviderApi={props.runtimeProviderApi}
            strategy='use-isolated-check'
          />
        </>
      );
    } else if (props.strategy === 'use-isolated') {
      // we get here after doing an isolated buildEntries call, after the initial results from the stubbed run have been used to instantiate.
      if (discovery.succeeded) {
        // we are done, all dependencies were resolved
        // props.onInitialized?.();
        return null;
      } else {
        return (
          <OffTreeNode
            declarationId={props.declarationId}
            discoveryFn={props.discoveryFn}
            localProviders={props.localProviders}
            nodeProps={props.nodeProps}
            registerId={props.registerId}
            runtimeProviderApi={props.runtimeProviderApi}
            strategy='use-all'
          />
        );
      }
      // go for use-all strategy, because isolated run failed with modules from stubbed run.

      // what we really want to do here is to check if it succeeded. if it succeeded, we know we are done, if not, we have to render an OffTreeNode with 'use-all' strategy
    } else if (props.strategy === 'use-isolated-check') {
      if (discovery.succeeded) {
        return null;
      } else {
        // throw new Error('Boom!');
        return null;
      }
    } else if (props.strategy === 'use-all') {
      return (
        <>
          {Array.from(discovery.offTreeMap.values())
            .reverse()
            .map((ancestor) => {
              return (
                <OffTreeNode
                  key={ancestor.id}
                  declarationId={ancestor.declId}
                  discoveryFn={props.discoveryFn}
                  localProviders={ancestor.localProviders}
                  nodeProps={ancestor.props}
                  registerId={ancestor.id}
                  runtimeProviderApi={props.runtimeProviderApi}
                  strategy='use-isolated-check'
                />
              );
            })}
          <OffTreeNode
            // do a final run
            key={props.registerId}
            declarationId={props.declarationId}
            discoveryFn={props.discoveryFn}
            localProviders={props.localProviders}
            nodeProps={props.nodeProps}
            // options={props.options}
            registerId={props.registerId}
            runtimeProviderApi={props.runtimeProviderApi}
            strategy='use-public'
          />
        </>
      );
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (props.strategy === 'use-public') {
      if (!discovery.succeeded) {
        throw new Error(
          'Missing upstream dependencies! Make sure your providerScope provides all upstream dependencies and is self sufficient, or use withMock, to stub missing ones.'
        );
      } else {
        return null;
      }
    }
  },
  (previous, next) => {
    console.log({ previous, next });
    // never re-render on props change
    return true;
  }
);
