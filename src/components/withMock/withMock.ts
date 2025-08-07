// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Layer } from 'effect';
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
  type ExtractStaticUpstream,
  type RuntimeModule,
  type IdProp,
  type Extensible,
} from 'types';
import { getDisplayName, type ExtractMeta } from 'utils/react';
import { isRuntimeModule } from 'utils/runtime';
import {
  createWrapper,
  finalizeWrapper,
} from '../common/providerFactory/providerFactory';
import {
  getStaticComponent,
  getStaticDeclarationId,
  getStaticProviderList,
} from '../common/providerFactory/utils/static';

// the idea of withMock, is that we accept a component that has already been composed, instead of using it as a target to render, we read the static properties from it, the entries and the original component. of the composed component. then we recreate what would've been done in the last hoc of the composed component, but this time, we provide mocked values for either props or layer. The only thing we have to think about is, how do we mock the layer of a specific hoc. do we use the module and its key together with the mocked layer, and do we support props through the same withMock hoc. We might be able to get this working by supporting multiple variants of arguments. this way a user can use multiple withMock hocs in tests.

export function withMock<
  C extends React.FC<any>,
  C1 extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = IdProp & SetOptional<React.ComponentProps<C>, keyof TProps>,
>(
  target: C1,
  props: React.ComponentProps<C1>
): (Component: C) => React.FC<Simplify<TResult>> & StaticProperties<C, TProps>;

export function withMock<
  C extends React.FC<any>,
  TProps extends Partial<Extensible<React.ComponentProps<C>>>,
  TResult = IdProp & SetOptional<React.ComponentProps<C>, keyof TProps>,
  R = unknown,
>(
  module: RuntimeModule<R>,
  layer: Layer.Layer<R>
): (Component: C) => React.FC<Simplify<TResult>> & StaticProperties<C, TProps>;

//
export function withMock<R, C extends React.FC<any>, C1 extends React.FC<any>>(
  moduleOrComponent: RuntimeModule<R> | C1,
  input: Layer.Layer<R> | React.ComponentProps<C1>
) {
  const isModule = isRuntimeModule<R>(moduleOrComponent);
  const module = isModule ? moduleOrComponent : undefined;
  const component = !isModule ? moduleOrComponent : undefined;

  // TODO: handle both cases where we either have a module or component.

  return (Component: C) => {
    const declarationId = (getStaticDeclarationId(Component) ??
      uuid()) as DeclarationId;

    const target = getStaticComponent(Component) ?? Component;
    const localProviders = getStaticProviderList<C, R>(Component);

    const componentRegistry = getComponentRegistry();
    const targetName = getDisplayName(target);

    const Wrapper = createWrapper(Component, target, targetName);
    const Memo = finalizeWrapper(
      Wrapper,
      Component,
      declarationId,
      target,
      localProviders,
      targetName
    );

    componentRegistry.register(declarationId, Memo);
    return Memo as never;
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
