/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge, SetOptional } from 'type-fest';
import { v4 as uuid } from 'uuid';
import {
  createWrapper,
  finalizeWrapper,
} from 'components/common/providerFactory/providerFactory';
import {
  getStaticDeclarationId,
  getStaticComponent,
  getStaticProviderList,
} from 'components/common/providerFactory/utils/static';
import { getComponentRegistry } from 'hooks/useComponentRegistry/useComponentRegistry';
import type {
  RuntimeModule,
  PROVIDERS_PROP,
  ExtractStaticProviders,
  COMPONENT_PROP,
  ExtractStaticComponent,
  PROPS_PROP,
  ExtractStaticProps,
  UPSTREAM_PROP,
  TraverseDeps,
  KeepUpstream,
  Up,
  ProviderFn,
  DeclarationId,
  ProviderEntry,
  ProviderId,
} from 'types';
import { getDisplayName, type ExtractMeta } from 'utils/react';

export function withUpstream<
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
  C extends React.FC<any>,
  TContext,
  R,
>(
  Context: TContext & RuntimeModule<R>,
  fn: ProviderFn<R, C, TProps>
): (Component: C) => React.FC<
  Simplify<{ id: string } & SetOptional<React.ComponentProps<C>, keyof TProps>>
> &
  Merge<
    ExtractMeta<C>,
    {
      [UPSTREAM_PROP]: TraverseDeps<{
        [PROVIDERS_PROP]: KeepUpstream<
          [...ExtractStaticProviders<C>, Up<TContext>]
        >;
      }>;
      [PROVIDERS_PROP]: [...ExtractStaticProviders<C>, Up<TContext>];
      [COMPONENT_PROP]: ExtractStaticComponent<C>;
      [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
    }
  >;

export function withUpstream<
  C extends React.FC<any>,
  R,
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
>(module: RuntimeModule<R>, fn: ProviderFn<R, C, TProps>) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;
    const hocId = uuid();

    const target = getStaticComponent(Component) ?? Component;
    const localProviders = getStaticProviderList<C, R>(Component);
    const provider = createUpstreamEntry<R, C>(hocId as ProviderId, module, fn);

    const componentRegistry = getComponentRegistry();
    const targetName = getDisplayName(target, 'withRuntime');

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

function createUpstreamEntry<R, C extends React.FC<any>>(
  id: ProviderId,
  module: RuntimeModule<R>,
  fn: ProviderFn<R, C>
): ProviderEntry<R, C> {
  return {
    type: 'upstream',
    id,
    module,
    fn,
  };
}
