/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-invalid-void-type */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge, IsNever, IsLiteral } from 'type-fest';
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
  PROPS_PROP,
  ExtractProviderProps,
  ProviderFn,
  DeclarationId,
  ProviderEntry,
  ProviderId,
  IdProp,
  ExtensibleProps,
  ResultProps,
  ERROR_PROP,
} from 'types';
import { getDisplayName, type ExtractMeta } from 'utils/react';

export function withUpstream<
  R,
  CProps, // component props static
  TProps extends ExtensibleProps<CProps>, // local provider props (inferred)
  PProps, // providerProps cumulative
  PErrors extends string[], // errors cumulative
  // the resulting component takes all original props, not returned by providers as is, makes all original props that are provided optional, and adds new properties and id as optional.
>(
  module: RuntimeModule<R>,
  fn: ProviderFn<R, PProps & Partial<CProps>, TProps>
): (
  Component:
    | ({ [PROPS_PROP]: PProps } & React.FC<CProps>)
    | ({ [ERROR_PROP]: PErrors } & React.FC<CProps>)
    | React.FC<CProps>
  // empty object
) => IsNever<keyof TProps> extends true
  ? React.FC<Simplify<ResultProps<CProps, TProps>>> &
      StaticProperties<
        React.FC<Simplify<CProps>>,
        Readonly<Merge<PProps, TProps>>,
        PErrors
      >
  : // contraint widening on error with overlap
    IsLiteral<keyof TProps> extends true
    ? React.FC<Simplify<ResultProps<CProps, TProps>>> &
        StaticProperties<
          React.FC<Simplify<CProps>>,
          Readonly<Merge<PProps, TProps>>,
          PErrors
        >
    : React.FC<Simplify<CProps>> & {
        _error: ['Type mismatch on provided props'];
      };

// captures void return only
export function withUpstream<
  R,
  CProps,
  TProps extends Partial<IdProp & Record<string, unknown>> | void,
  PProps,
  PErrors,
>(
  module: RuntimeModule<R>,
  fnVoid: ProviderFn<
    R,
    PProps & Partial<CProps>,
    // when the inferred return type is not void, we have to create a mismatch against the original props.
    TProps &
      (TProps extends Record<string, unknown> ? Partial<IdProp & CProps> : void)
  >
): (
  Component:
    | ({ [PROPS_PROP]: PProps } & React.FC<CProps>)
    | ({ [ERROR_PROP]: PErrors } & React.FC<CProps>)
    | React.FC<CProps>
) => React.FC<Simplify<Partial<IdProp> & CProps>> &
  StaticProperties<React.FC<Simplify<CProps>>, PProps>;

//
export function withUpstream<R, C extends React.FC<any>>(
  module: RuntimeModule<R>,
  fn: ProviderFn<any, any>
) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;
    const hocId = uuid();

    const dryRunId = getStaticDryRunId(Component);
    const target = getStaticComponent(Component) ?? Component;
    const provider = createUpstreamEntry<R, C>(hocId as ProviderId, module, fn);
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

type StaticProperties<C, TProps, TErrors = unknown> = TErrors extends [string]
  ? Merge<ExtractMeta<C>, { [ERROR_PROP]: TErrors }>
  : Merge<
      ExtractMeta<C>,
      {
        [PROPS_PROP]: IsNever<TProps> extends false
          ? Merge<ExtractProviderProps<C>, TProps>
          : ExtractProviderProps<C>;
      }
    >;
