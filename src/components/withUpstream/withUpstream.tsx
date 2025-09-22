/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-invalid-void-type */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type {
  Simplify,
  Merge,
  IsNever,
  IsLiteral,
  IsUnknown,
  IsEmptyObject,
} from 'type-fest';
import { v4 as uuid } from 'uuid';
import { CreateSystem, PropagateSystem } from 'components/common/System/System';
import {
  getStaticDeclarationId,
  getStaticComponent,
  getStaticProviderList,
  getStaticDryRunId,
} from 'components/common/System/utils/static';
import type {
  RuntimeModule,
  PROPS_PROP,
  ExtractStaticProps,
  ProviderFn,
  DeclarationId,
  ProviderEntry,
  ProviderId,
  IdProp,
  ExtensibleProps,
  ResultProps,
  ERROR_PROP,
  UpstreamProviderFn,
  RuntimeContext,
} from 'types';
import { isRuntimeContext } from 'utils/effect/runtime';
import { getDisplayName, type ExtractMeta } from 'utils/react';

export function WithUpstream<
  CProps, // component props static
  TProps extends ExtensibleProps<CProps>, // local provider props (inferred)
  PProps, // providerProps cumulative
  PErrors, // errors cumulative
>(
  fn: UpstreamProviderFn<Simplify<PProps & Partial<CProps>>, TProps>
): (
  Component:
    | ({ [PROPS_PROP]: PProps } & React.FC<CProps>)
    | ({ [ERROR_PROP]: PErrors } & React.FC<CProps>)
    | React.FC<CProps>
  // empty object
) => [
  IsUnknown<PErrors>,
  IsLiteral<keyof TProps> & IsEmptyObject<TProps>,
] extends [true, true]
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

// captures void return only
export function WithUpstream<
  CProps,
  TProps extends Partial<IdProp & Record<string, unknown>> | void,
  PProps,
  PErrors,
>(
  fnVoid: UpstreamProviderFn<
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
) => IsUnknown<PErrors> extends true
  ? React.FC<Simplify<Partial<IdProp> & CProps>> &
      StaticProperties<React.FC<Simplify<CProps>>, PProps, PErrors>
  : React.FC<Simplify<CProps>> & {
      _error: ['Type mismatch on provided props'];
    };

/**
 * @deprecated In the upcoming 2.0 release, we will remove support for runtime modules as argument. Instead, use the inject API from the function arguments.
 */
export function WithUpstream<
  R,
  CProps, // component props static
  TProps extends ExtensibleProps<CProps>, // local provider props (inferred)
  PProps, // providerProps cumulative
  PErrors, // errors cumulative
  // the resulting component takes all original props, not returned by providers as is, makes all original props that are provided optional, and adds new properties and id as optional.
>(
  module: RuntimeContext<R>,
  fn: ProviderFn<R, PProps & Partial<CProps>, TProps>
): (
  Component:
    | ({ [PROPS_PROP]: PProps } & React.FC<CProps>)
    | ({ [ERROR_PROP]: PErrors } & React.FC<CProps>)
    | React.FC<CProps>
  // empty object
) => [
  IsUnknown<PErrors>,
  IsLiteral<keyof TProps> & IsEmptyObject<TProps>,
] extends [true, true]
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

// captures void return only
export function WithUpstream<
  R,
  CProps,
  TProps extends Partial<IdProp & Record<string, unknown>> | void,
  PProps,
  PErrors,
>(
  module: RuntimeContext<R>,
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
) => IsUnknown<PErrors> extends true
  ? React.FC<Simplify<Partial<IdProp> & CProps>> &
      StaticProperties<React.FC<Simplify<CProps>>, PProps, PErrors>
  : React.FC<Simplify<CProps>> & {
      _error: ['Type mismatch on provided props'];
    };

//* implementation

export function WithUpstream<R, C extends React.FC<any>>(
  moduleOrFn: RuntimeContext<R> | UpstreamProviderFn<any, any>,
  fn?: ProviderFn<any, any>
) {
  const isModule = isRuntimeContext(moduleOrFn);
  const shouldPopulate = !isModule;
  const module = isModule ? moduleOrFn : undefined;
  const providerFn = isModule
    ? (fn as ProviderFn<any, any>)
    : (moduleOrFn as UpstreamProviderFn<any, any>);

  if (shouldPopulate) {
    // what do we do if we don't have a module provided? run the provided function and collect everything through inject.
    // in order to make this happen, we first need to expose an inject api, then we can use the implementation to collect the arguments used.
    // the first argument will be the runtime provider, so we can easily register, upstream entries for each. we only have to think about what else we associate with it, because earlier, we had a function for each entry, but now we just need to create an entry for each inject() use in a deduped fashion.
    // const createRuntimeApi = useRuntimeApi(scopeId);
    // const createApiProxy = useApiProxyFactory<R>(createRuntimeApi, name);
    // const createPropsProxy = usePropsProxyFactory(name);
    // const propsProxy = createPropsProxy(currentProps.get());
    // const apiProxy = createApiProxy(entry, instances, factory, propsProxy);
    // const result = providerFn();
  }

  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;
    const hocId = uuid();

    const dryRunId = getStaticDryRunId(Component);
    const target = getStaticComponent(Component) ?? Component;

    // TODO: find a different way to handle this
    const provider = createUpstreamEntry<R, C>(
      hocId as ProviderId,
      module,
      providerFn
    );
    const localProviders = getStaticProviderList<C, R>(Component, [provider]);
    const targetName = getDisplayName(target, 'withRuntime');

    const Wrapper = CreateSystem(
      declarationId,
      Component,
      target,
      targetName,
      provider
    );
    const Memo = PropagateSystem(
      declarationId,
      dryRunId,
      Component,
      Wrapper,
      target,
      localProviders,
      targetName
    );

    // TODO: if dryRunId is NOT null, that means we need to render memo inside a component that renders the OffTreeNodes, so everything is ready before the actual root renders.
    // return createRoot(Memo, dryRunId, provider) as never;
    return Memo as never;
  };
}

function createUpstreamEntry<R, C extends React.FC<any>>(
  id: ProviderId,
  module: RuntimeContext<any> | undefined,
  fn: ProviderFn<R, C> | UpstreamProviderFn<C, any>
): ProviderEntry<R, C> {
  return { type: 'upstream', id, fn, module };
}

type StaticProperties<C, TProps, TErrors = unknown> = TErrors extends [string]
  ? Merge<ExtractMeta<C>, { [ERROR_PROP]: TErrors }>
  : Merge<
      ExtractMeta<C>,
      {
        [PROPS_PROP]: IsNever<TProps> extends false
          ? Merge<ExtractStaticProps<C>, TProps>
          : ExtractStaticProps<C>;
      }
    >;
