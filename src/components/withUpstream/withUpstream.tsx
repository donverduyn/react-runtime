/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge, SetOptional } from 'type-fest';
import { providerFactory } from 'components/common/providerFactory/providerFactory';
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
  ProviderConfigFn,
} from 'types';
import { type ExtractMeta } from 'utils/react';

const withUpstreamImpl = providerFactory('upstream', 'withUpstream');

export function withUpstream<
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
  C extends React.FC<any>,
  TContext,
  R,
>(
  Context: TContext & RuntimeModule<R>,
  configFn?: ProviderConfigFn<R, C, TProps>
): (Component: C) => React.FC<
  Simplify<{ id: string } & SetOptional<React.ComponentProps<C>, keyof TProps>>
> &
  Merge<
    ExtractMeta<C>,
    {
      [UPSTREAM_PROP]: TraverseDeps<{
        [PROVIDERS_PROP]: KeepUpstream<
          [...ExtractStaticProviders<C>, Up<TContext>]
        >;
      }>;
      [PROVIDERS_PROP]: [...ExtractStaticProviders<C>, Up<TContext>];
      [COMPONENT_PROP]: ExtractStaticComponent<C>;
      [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
    }
  >;

export function withUpstream<
  C extends React.FC<any>,
  R,
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
>(Context: RuntimeModule<R>, configFn?: ProviderConfigFn<R, C, TProps>) {
  return withUpstreamImpl(Context, configFn);
}
