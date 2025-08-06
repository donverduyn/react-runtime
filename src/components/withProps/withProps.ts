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
  type PropsFn,
  type ProviderId,
  type ProviderEntry,
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

export function withProps<
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
  C extends React.FC<any>,
>(
  fn: PropsFn<C, TProps>
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

export function withProps<R, C extends React.FC<any>>(fn: PropsFn<C>) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;
    const hocId = uuid();

    const target = getStaticComponent(Component) ?? Component;
    const localProviders = getStaticProviderList<C, R>(Component);
    const provider = createPropsEntry<R, C>(hocId as ProviderId, fn);

    const componentRegistry = getComponentRegistry();
    const targetName = getDisplayName(target);

    const Wrapper = createWrapper(Component, target, targetName, provider);
    const Memo = finalizeWrapper(
      Wrapper,
      Component,
      declarationId,
      target,
      localProviders.concat(provider),
      targetName
    );

    componentRegistry.register(declarationId, Memo);
    return Memo as never;
  };
}

function createPropsEntry<R, C extends React.FC<any>>(
  id: ProviderId,
  configFn: PropsFn<C>
): ProviderEntry<R, C> {
  return {
    id,
    type: 'props',
    fn: configFn,
  };
}
