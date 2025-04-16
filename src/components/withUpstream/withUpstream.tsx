/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge } from 'type-fest';
import { hocFactory } from 'components/common/factory';
import type {
  RuntimeContextReference,
  RuntimeApi,
  RUNTIME_PROP,
  ExtractStaticRegistry,
  COMPONENT_PROP,
  ExtractStaticComponent,
} from 'components/common/types';
import { type ExtractMeta } from 'utils/react';

export function withUpstream<TProps, C extends React.FC<any>, TContext, R>(
  Context: TContext & RuntimeContextReference<R>,
  getSource: (
    api: { runtime: RuntimeApi<R> },
    props: Simplify<Partial<React.ComponentProps<C>>>
  ) => TProps
): (Component: C) => React.FC<
  Simplify<Omit<React.ComponentProps<C>, keyof TProps>>
> &
  Merge<
    ExtractMeta<C>,
    {
      [RUNTIME_PROP]: ExtractStaticRegistry<C> extends never
        ? [TContext]
        : [...ExtractStaticRegistry<C>, TContext];
      [COMPONENT_PROP]: ExtractStaticComponent<C>;
    }
  >;

export function withUpstream<TTarget, C extends React.FC<any>>(
  Context: RuntimeContextReference<TTarget>,
  getSource?: (
    api: { runtime: RuntimeApi<TTarget> },
    props: Simplify<Partial<React.ComponentProps<C>>>
  ) => void
): (
  Component: C
) => React.FC<Simplify<React.ComponentProps<C>>> & Simplify<ExtractMeta<C>>;

export function withUpstream<
  C extends React.FC<any>,
  R,
  TProps extends Record<string, unknown> | undefined,
>(
  Context: RuntimeContextReference<R>,
  getSource?: (
    api: { runtime: RuntimeApi<R> },
    props: Partial<React.ComponentProps<C>>
  ) => TProps
) {
  const hoc = hocFactory('upstream', 'withUpstream');
  return hoc(Context, getSource);
}
