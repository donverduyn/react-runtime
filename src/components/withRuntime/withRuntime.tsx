/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge, SetOptional } from 'type-fest';
import { v4 as uuid } from 'uuid';
import { createSystem, propagateSystem } from 'components/common/System/System';
import {
  getStaticDeclarationId,
  getStaticComponent,
  getStaticProviderList,
  getStaticDryRunId,
} from 'components/common/System/utils/static';
import type {
  RuntimeModule,
  PROVIDERS_PROP,
  ExtractStaticProviders,
  COMPONENT_PROP,
  ExtractStaticComponent,
  PROPS_PROP,
  ExtractStaticProps,
  UPSTREAM_PROP,
  ExtractStaticUpstream,
  Down,
  ProviderFn,
  DeclarationId,
  ProviderEntry,
  ProviderId,
  IdProp,
  Extensible,
} from 'types';
import { getDisplayName, type ExtractMeta } from 'utils/react';

export function withRuntime<
  C extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = IdProp & SetOptional<React.ComponentProps<C>, keyof TProps>,
  R = unknown,
>(
  module: RuntimeModule<R>,
  fn?: ProviderFn<R, C, TProps>
): (
  Component: C
) => React.FC<Simplify<TResult>> &
  StaticProperties<C, RuntimeModule<R>, TProps>;

export function withRuntime<
  C extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = IdProp & SetOptional<React.ComponentProps<C>, keyof TProps>,
  R = unknown,
>(
  module: RuntimeModule<R>,
  fnVoid?: ProviderFn<R, C>
): (
  Component: C
) => React.FC<Simplify<TResult>> &
  StaticProperties<C, RuntimeModule<R>, TProps>;

//
export function withRuntime<C extends React.FC<any>, R>(
  module: RuntimeModule<R>,
  fn?: ProviderFn<any, any>
) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;
    const hocId = uuid();

    const dryRunId = getStaticDryRunId(Component);
    const target = getStaticComponent(Component) ?? Component;
    const provider = createRuntimeEntry<R, C>(hocId as ProviderId, module, fn);
    const localProviders = getStaticProviderList<C, R>(Component, provider);
    const targetName = getDisplayName(target, 'withRuntime');

    const Wrapper = createSystem(
      declarationId,
      Component,
      target,
      targetName,
      provider
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

    return Memo as never;
  };
}

function createRuntimeEntry<R, C extends React.FC<any>>(
  id: ProviderId,
  module: RuntimeModule<R>,
  fn?: ProviderFn<R, C>
): ProviderEntry<R, C> {
  return {
    type: 'runtime',
    id,
    module,
    fn,
  };
}

type StaticProperties<C, TModule, TProps> = Merge<
  ExtractMeta<C>,
  {
    [UPSTREAM_PROP]: ExtractStaticUpstream<C>;
    [PROVIDERS_PROP]: [...ExtractStaticProviders<C>, Down<TModule>];
    [COMPONENT_PROP]: ExtractStaticComponent<C>;
    [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
  }
>;
