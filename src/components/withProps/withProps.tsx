/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge, IsLiteral, IsUnknown, IsNever } from 'type-fest';
import { v4 as uuid } from 'uuid';
import {
  type PROPS_PROP,
  type ExtractProviderProps,
  type DeclarationId,
  type PropsFn,
  type ProviderId,
  type ProviderEntry,
  type ExtensibleProps,
  type ERROR_PROP,
  type ResultProps,
} from '@/types';
import { getDisplayName, type ExtractMeta } from 'utils/react';
import { createSystem, propagateSystem } from '../common/System/System';
import {
  getStaticComponent,
  getStaticDeclarationId,
  getStaticDryRunId,
  getStaticProviderList,
} from '../common/System/utils/static';

export function withProps<
  CProps,
  TProps extends ExtensibleProps<CProps>,
  PProps,
  PErrors,
>(
  fn: PropsFn<PProps & Partial<CProps>, TProps>
): (
  Component: ({ [PROPS_PROP]: PProps } & React.FC<CProps>) | React.FC<CProps>
) => IsUnknown<PErrors> extends true
  ? React.FC<Simplify<ResultProps<CProps, TProps>>> &
      StaticProperties<
        React.FC<Simplify<CProps>>,
        Readonly<
          // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          Merge<PProps, IsLiteral<keyof TProps> extends true ? TProps : {}>
        >,
        PErrors
      >
  : // constraint widening on error with overlap
    React.FC<Simplify<CProps>> & {
      _error: ['Type mismatch on provided props'];
    };

// React.FC<Simplify<Partial<IdProp> & CProps>> &
// StaticProperties<React.FC<Simplify<CProps>>, TProps>;

//
export function withProps<R, C extends React.FC<any>>(fn: PropsFn<C>) {
  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;
    const hocId = uuid();

    const dryRunId = getStaticDryRunId(Component);
    const target = getStaticComponent(Component) ?? Component;
    const provider = createPropsEntry<R, C>(hocId as ProviderId, fn);
    const localProviders = getStaticProviderList<C, R>(Component, [provider]);
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
