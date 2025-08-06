// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, SetOptional, Merge } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { getComponentRegistry } from 'hooks/useComponentRegistry/useComponentRegistry';
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
} from 'types';
import { getDisplayName, type ExtractMeta } from 'utils/react';
import {
  createWrapper,
  finalizeWrapper,
} from '../common/providerFactory/providerFactory';
import {
  getStaticComponent,
  getStaticDeclarationId,
  getStaticProviderList,
} from '../common/providerFactory/utils/static';

export function withAutoMock<
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
  C extends React.FC<any>,
  C1 extends React.FC<any>,
>(
  RootComponent: C1
): (Component: C) => React.FC<
  Simplify<{ id: string } & SetOptional<React.ComponentProps<C>, keyof TProps>>
> &
  Merge<
    ExtractMeta<C>,
    {
      [UPSTREAM_PROP]: ExtractStaticUpstream<C>;
      [PROVIDERS_PROP]: ExtractStaticProviders<C>;
      [COMPONENT_PROP]: ExtractStaticComponent<C>;
      [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
    }
  >;

export function withAutoMock<
  R,
  C extends React.FC<any>,
  C1 extends React.FC<any>,
>(RootComponent: C1) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;

    const target = getStaticComponent(Component) ?? Component;
    const localProviders = getStaticProviderList<C, R>(Component);
    const componentRegistry = getComponentRegistry();
    const targetName = getDisplayName(target);

    const Wrapper = createWrapper(Component, target, targetName);
    const Memo = finalizeWrapper(
      Wrapper,
      Component,
      declarationId,
      target,
      localProviders,
      targetName
    );

    componentRegistry.register(declarationId, Memo);
    // componentRegistry.register('__ROOT__' as DeclarationId, RootComponent);

    // TODO: instead of registering the real root component, we can use it directly to kick off a dry run here on module load, from the provided root component. We can use the Wrapper to traverse from the root component to the target component and track the parent/child relationships between components inbetween. Based on this information we can use a separate ProviderMap to traverse upward and remove the need to rely on component references in runtime modules.
    return Memo as never;
  };
}
