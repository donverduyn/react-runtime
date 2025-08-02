/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge } from 'type-fest';
import { providerFactory } from 'components/common/providerFactory';
import type {
  RuntimeModule,
  PROVIDERS_PROP,
  ExtractStaticHocEntries,
  COMPONENT_PROP,
  ExtractStaticComponent,
  PROPS_PROP,
  ExtractStaticProps,
  UPSTREAM_PROP,
  TraverseDeps,
  KeepUpstream,
  Up,
  ProviderConfigFn,
} from 'components/common/types';
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
  Simplify<{ id: string } & Omit<React.ComponentProps<C>, keyof TProps>>
> &
  Merge<
    ExtractMeta<C>,
    {
      [UPSTREAM_PROP]: TraverseDeps<{
        [PROVIDERS_PROP]: KeepUpstream<
          [...ExtractStaticHocEntries<C>, Up<TContext>]
        >;
      }>;
      [PROVIDERS_PROP]: [...ExtractStaticHocEntries<C>, Up<TContext>];
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
