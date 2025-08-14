// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, SetOptional, Merge } from 'type-fest';
import { v4 as uuid } from 'uuid';
import {
  type ExtractStaticComponent,
  type ExtractStaticProviders,
  type PROPS_PROP,
  type ExtractStaticProps,
  COMPONENT_PROP,
  PROVIDERS_PROP,
  type UPSTREAM_PROP,
  type DeclarationId,
  type ExtractStaticUpstream,
  type IdProp,
  type Extensible,
} from 'types';
import { getDisplayName, type ExtractMeta } from 'utils/react';
import { createChildrenSketch } from 'utils/react/children';
import { createSystem, propagateSystem } from '../common/System/System';
import {
  getStaticComponent,
  getStaticDeclarationId,
  getStaticProviderList,
} from '../common/System/utils/static';
import { createDryRun } from './factories/DryRun';

export function withProviderScope<
  C extends React.FC<any>,
  C1 extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = IdProp & SetOptional<React.ComponentProps<C>, keyof TProps>,
>(
  RootComponent: C1,
  rootProps: React.ComponentProps<C1>
): (Component: C) => React.FC<Simplify<TResult>> & StaticProperties<C, TProps>;

export function withProviderScope<
  R,
  C extends React.FC<any>,
  C1 extends React.FC<any>,
>(RootComponent: C1, rootProps: React.ComponentProps<C1>) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;

    const target = getStaticComponent(Component) ?? Component;
    const localProviders = getStaticProviderList<C, R>(Component);
    const targetName = getDisplayName(target);

    const registerDryRun = (
      props: React.PropsWithChildren<IdProp>,
      hasRun: boolean
    ) => {
      const result = createDryRun(RootComponent, rootProps, {
        declId: declarationId,
        instId: props.id,
        childSketch: createChildrenSketch(props.children),
      });
    };

    const Wrapper = createSystem(
      declarationId,
      Component,
      target,
      targetName,
      undefined,
      registerDryRun
    );
    const Memo = propagateSystem(
      declarationId,
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
    [UPSTREAM_PROP]: ExtractStaticUpstream<C>;
    [PROVIDERS_PROP]: ExtractStaticProviders<C>;
    [COMPONENT_PROP]: ExtractStaticComponent<C>;
    [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
  }
>;
