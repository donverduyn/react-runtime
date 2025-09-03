// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge } from 'type-fest';
import {
  type PROPS_PROP,
  type ExtractProviderProps,
  type DeclarationId,
  type IdProp,
  type Extensible,
  type ScopeId,
  type ERROR_PROP,
  type ExtractStaticError,
} from '@/types';
import { createDryRun } from 'hooks/useDryRun/useDryRun';
import { getDisplayName, type ExtractMeta } from 'utils/react';
import { createSystem, propagateSystem } from '../common/System/System';
import {
  getStaticComponent,
  getStaticDeclarationId,
  getStaticProviderList,
} from '../common/System/utils/static';

type PropsOrEmpty<P> = keyof P extends never ? Record<never, never> : P;
let count = 0;

export function withProviderScope<
  C extends React.FC<any>,
  C1 extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = Partial<IdProp> & React.ComponentProps<C>,
>(
  RootComponent: C1,
  rootProps?: PropsOrEmpty<React.ComponentProps<C1>>
): (Component: C) => React.FC<Simplify<TResult>> & StaticProperties<C, TProps>;

export function withProviderScope<
  R,
  C extends React.FC<any>,
  C1 extends React.FC<any>,
>(RootComponent: C1, rootProps?: PropsOrEmpty<React.ComponentProps<C1>>) {
  return (Component: C) => {
    // if the user uses an unwrapped component as a portable root, we cannot determine what the target is, so we have to throw an error, where the user is offered to options. either use withId, on the unwrapped portable root inside the app hierarchy (for production analytics in storybook, for example, to make it digestible), or to suggest to use withParentTag so we can use the parent as target and collect candidate chains from there. Since the portable root doesn't have providers itself, we know we can't miss any providers by using the parent as target. Note that withParentTag, will assign a declaration id to the component itself, but since it's not available in the app hierarchy, it won't be registered, but that's why we rely on the declid of the provided parent tag as an argument.
    const declarationId = getStaticDeclarationId(
      Component
    ) as DeclarationId | null;

    if (declarationId === null) {
      throw new Error(noDeclarationMessage(Component));
    }

    const target = getStaticComponent(Component) ?? Component;
    const localProviders = getStaticProviderList<C, R>(Component);
    const targetName = getDisplayName(target);

    const dryRunId = `dry-run-${String(count++)}` as ScopeId;
    // makes api instance available under dryRunId
    createDryRun(dryRunId, RootComponent, rootProps, declarationId);

    const Wrapper = createSystem(
      declarationId,
      Component,
      target,
      targetName,
      undefined,
      dryRunId
    );
    const Memo = propagateSystem(
      declarationId,
      dryRunId,
      Component,
      Wrapper,
      target,
      localProviders,
      targetName
    );

    // componentRegistry.register('__ROOT__' as DeclarationId, RootComponent);

    // TODO: instead of registering the real root component, we can use it directly to kick off a dry run here on module load, from the provided root component. We can use the Wrapper to traverse from the root component to the target component and track the parent/child relationships between components inbetween. Based on this information we can use a separate ProviderMap to traverse upward and remove the need to rely on component references in runtime modules.
    return Memo as never;
  };
}

type StaticProperties<C, TProps> = Merge<
  ExtractMeta<C>,
  {
    // [UPSTREAM_PROP]: ExtractStaticUpstream<C>;
    // [PROVIDERS_PROP]: ExtractStaticProviders<C>;
    // [COMPONENT_PROP]: ExtractStaticComponent<C>;
    [PROPS_PROP]: Merge<ExtractProviderProps<C>, TProps>;
    [ERROR_PROP]: ExtractStaticError<C>;
  }
>;

function noDeclarationMessage(component: React.FC<any>) {
  return `Component with name "${getDisplayName(component)}" cannot be identified as a target for off-tree provider traversal. Use withId on the component itself, to make it discoverable and to enable additional analytics in tools like Storybook, or use withParentTag on the portable root to use the parent component as a target for provider resolution.`;
}
