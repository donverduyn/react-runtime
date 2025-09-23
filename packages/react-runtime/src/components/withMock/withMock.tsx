/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Layer } from 'effect';
import type { Simplify, Merge } from 'type-fest';
import { v4 as uuid } from 'uuid';
import {
  type PROPS_PROP,
  type ExtractStaticProps,
  type DeclarationId,
  type RuntimeContext,
  type IdProp,
  type Extensible,
  type ERROR_PROP,
  type ExtractStaticError,
} from '@/types';
import { isRuntimeContext } from '@/utils/effect/runtime';
import { getDisplayName, type ExtractMeta } from '@/utils/react';
import { CreateSystem, PropagateSystem } from '../common/System/System';
import {
  getStaticComponent,
  getStaticDeclarationId,
  getStaticDryRunId,
  getStaticProviderList,
} from '../common/System/utils/static';

// the idea of withMock, is that we accept a component that has already been composed, instead of using it as a target to render, we read the static properties from it, the entries and the original component. of the composed component. then we recreate what would've been done in the last hoc of the composed component, but this time, we provide mocked values for either props or layer. The only thing we have to think about is, how do we mock the layer of a specific hoc. do we use the Context and its key together with the mocked layer, and do we support props through the same withMock hoc. We might be able to get this working by supporting multiple variants of arguments. this way a user can use multiple withMock hocs in tests.

export function WithMock<
  C extends React.FC<any>,
  C1 extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = Partial<IdProp> & React.ComponentProps<C>,
>(
  target: C1,
  props: React.ComponentProps<C1>
): (Component: C) => React.FC<Simplify<TResult>> & StaticProperties<C, TProps>;

export function WithMock<
  C extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = Partial<IdProp> & React.ComponentProps<C>,
  R = unknown,
>(
  Context: RuntimeContext<R>,
  layer: Layer.Layer<R>
): (Component: C) => React.FC<Simplify<TResult>> & StaticProperties<C, TProps>;

//
export function WithMock<R, C extends React.FC<any>, C1 extends React.FC<any>>(
  ContextOrComponent: RuntimeContext<R> | C1,
  input: Layer.Layer<R> | React.ComponentProps<C1>
) {
  const isContext = isRuntimeContext<R>(ContextOrComponent);
  const Context = isContext ? ContextOrComponent : undefined;
  const component = !isContext ? ContextOrComponent : undefined;

  // TODO: handle both cases where we either have a Context or component.
  // TODO: make mocks available during dry runs. think about how we want to validate that all mocks are provided when a certain provider scope root is used.

  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;

    const dryRunId = getStaticDryRunId(Component);
    const target = getStaticComponent(Component) ?? Component;
    const localProviders = getStaticProviderList<C, R>(Component);
    const targetName = getDisplayName(target);

    const Wrapper = CreateSystem(declarationId, Component, target, targetName);
    const Memo = PropagateSystem(
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

type StaticProperties<C, TProps> = Merge<
  ExtractMeta<C>,
  {
    // [UPSTREAM_PROP]: ExtractStaticUpstream<C>;
    // [PROVIDERS_PROP]: ExtractStaticProviders<C>;
    // [COMPONENT_PROP]: ExtractStaticComponent<C>;
    [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
    [ERROR_PROP]: ExtractStaticError<C>;
  }
>;
