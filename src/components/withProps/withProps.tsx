/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
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
  type PropsFn,
  type ProviderId,
  type ProviderEntry,
  type ExtractStaticUpstream,
  type IdProp,
  type Extensible,
} from 'types';
import { getDisplayName, type ExtractMeta } from 'utils/react';
import { createSystem, propagateSystem } from '../common/System/System';
import {
  getStaticComponent,
  getStaticDeclarationId,
  getStaticDryRunId,
  getStaticProviderList,
} from '../common/System/utils/static';

export function withProps<
  C extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = IdProp & SetOptional<React.ComponentProps<C>, keyof TProps>,
>(
  fn: PropsFn<C, TProps>
): (Component: C) => React.FC<Simplify<TResult>> & StaticProperties<C, TProps>;

//
export function withProps<R, C extends React.FC<any>>(fn: PropsFn<C>) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;
    const hocId = uuid();

    const dryRunId = getStaticDryRunId(Component);
    const target = getStaticComponent(Component) ?? Component;
    const provider = createPropsEntry<R, C>(hocId as ProviderId, fn);
    const localProviders = getStaticProviderList<C, R>(Component, provider);
    const targetName = getDisplayName(target);

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

function createPropsEntry<R, C extends React.FC<any>>(
  id: ProviderId,
  configFn: PropsFn<C>
): ProviderEntry<R, C> {
  return {
    type: 'props',
    id,
    fn: configFn,
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
