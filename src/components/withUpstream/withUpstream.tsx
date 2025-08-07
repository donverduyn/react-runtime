/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge, SetOptional } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { createEngine, propagateEngine } from 'components/common/Engine/Engine';
import {
  getStaticDeclarationId,
  getStaticComponent,
  getStaticProviderList,
} from 'components/common/Engine/utils/static';
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
  Extensible,
  IdProp,
} from 'types';
import { getDisplayName, type ExtractMeta } from 'utils/react';

export function withUpstream<
  C extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = IdProp & SetOptional<React.ComponentProps<C>, keyof TProps>,
  R = unknown,
>(
  module: RuntimeModule<R>,
  fn: ProviderFn<R, C, TProps>
): (
  Component: C
) => React.FC<Simplify<TResult>> &
  StaticProperties<C, RuntimeModule<R>, TProps>;

export function withUpstream<
  C extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = IdProp & SetOptional<React.ComponentProps<C>, keyof TProps>,
  R = unknown,
>(
  module: RuntimeModule<R>,
  fnVoid: ProviderFn<R, C>
): (
  Component: C
) => React.FC<Simplify<TResult>> &
  StaticProperties<C, RuntimeModule<R>, TProps>;

//
export function withUpstream<C extends React.FC<any>, R>(
  module: RuntimeModule<R>,
  fn: ProviderFn<any, any>
) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;
    const hocId = uuid();

    const target = getStaticComponent(Component) ?? Component;
    const localProviders = getStaticProviderList<C, R>(Component);
    const provider = createUpstreamEntry<R, C>(hocId as ProviderId, module, fn);

    const componentRegistry = getComponentRegistry();
    const targetName = getDisplayName(target, 'withRuntime');

    const Wrapper = createEngine(Component, target, targetName, provider);
    const Memo = propagateEngine(
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

type StaticProperties<C, TModule, TProps> = Merge<
  ExtractMeta<C>,
  {
    [UPSTREAM_PROP]: TraverseDeps<{
      [PROVIDERS_PROP]: KeepUpstream<
        [...ExtractStaticProviders<C>, Up<TModule>]
      >;
    }>;
    [PROVIDERS_PROP]: [...ExtractStaticProviders<C>, Up<TModule>];
    [COMPONENT_PROP]: ExtractStaticComponent<C>;
    [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
  }
>;
