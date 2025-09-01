/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-invalid-void-type */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge, IsNever } from 'type-fest';
import { v4 as uuid } from 'uuid';
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
  IsPrimitiveString,
} from '@/types';
import { createSystem, propagateSystem } from 'components/common/System/System';
import {
  getStaticDeclarationId,
  getStaticComponent,
  getStaticProviderList,
  getStaticDryRunId,
} from 'components/common/System/utils/static';
import { getDisplayName, type ExtractMeta } from 'utils/react';

// export function withRuntime<
//   C extends React.FC<any>,
//   TProps extends Partial<Extensible<React.ComponentProps<C>>>,
//   TResult = Partial<IdProp> & React.ComponentProps<C>,
//   R = unknown,
// >(
//   module: RuntimeModule<R>,
//   fn?: ProviderFn<R, C, TProps>
// ): (
//   Component: C
// ) => React.FC<Simplify<TResult>> &
//   StaticProperties<C, RuntimeModule<R>, TProps>;

// export function withRuntime<
//   C extends React.FC<any>,
//   TProps extends Partial<Extensible<React.ComponentProps<C>>>,
//   TResult = Partial<IdProp> & React.ComponentProps<C>,
//   R = unknown,
// >(
//   module: RuntimeModule<R>,
//   fnVoid?: ProviderFn<R, C>
// ): (
//   Component: C
// ) => React.FC<Simplify<TResult>> &
//   StaticProperties<C, RuntimeModule<R>, TProps>;

export function withRuntime<
  C extends React.FC<any>,
  TProps extends Extensible<Partial<IdProp & React.ComponentProps<C>>>,
  TKeys extends PropertyKey = IsPrimitiveString<keyof TProps> extends false
    ? keyof TProps
    : never,
  TResult = Omit<React.ComponentProps<C>, TKeys> &
    Partial<
      IdProp &
        Pick<React.ComponentProps<C>, TKeys> &
        Omit<TProps, keyof React.ComponentProps<C>>
    >,
  R = unknown,
>(
  module: RuntimeModule<R>,
  fn: ProviderFn<R, React.FC<React.ComponentProps<C>>, TProps>
): (
  Component: C
) => IsNever<TKeys> extends false
  ? React.FC<Simplify<TResult>> &
      StaticProperties<
        React.FC<React.ComponentProps<C>>,
        RuntimeModule<R>,
        Omit<React.ComponentProps<C>, TKeys> & TProps
      >
  : any;

export function withRuntime<
  C extends React.FC<any>,
  TProps extends Partial<IdProp & Record<string, unknown>> | void,
  TResult = Partial<IdProp> & React.ComponentProps<C>,
  R = unknown,
>(
  module: RuntimeModule<R>,
  fnVoid: ProviderFn<
    R,
    React.FC<React.ComponentProps<C>>,
    TProps &
      (TProps extends Record<string, unknown>
        ? Partial<IdProp & React.ComponentProps<C>>
        : void)
  >
): (
  Component: C
) => React.FC<Simplify<TResult>> &
  StaticProperties<
    React.FC<React.ComponentProps<C>>,
    RuntimeModule<R>,
    IdProp & React.ComponentProps<C>
  >;

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
