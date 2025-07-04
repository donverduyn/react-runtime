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
  ExtractStaticRuntimes,
  COMPONENT_PROP,
  ExtractStaticComponent,
  PROPS_PROP,
  ExtractStaticProps,
  UPSTREAM_PROP,
  TraverseDeps,
  KeepUpstream,
  Up,
} from 'components/common/types';
import { type ExtractMeta } from 'utils/react';

const withUpstreamImpl = hocFactory('upstream', 'withUpstream');

export function withUpstream<TProps, C extends React.FC<any>, TContext, R>(
  Context: TContext & RuntimeContextReference<R>,
  getSource: (
    api: { runtime: RuntimeApi<R> },
    props: Merge<Partial<React.ComponentProps<C>>, ExtractStaticProps<C>>
  ) => TProps
): (Component: C) => React.FC<
  Simplify<Omit<React.ComponentProps<C> & { id?: string }, keyof TProps>>
> &
  Merge<
    ExtractMeta<C>,
    {
      [UPSTREAM_PROP]: TraverseDeps<{
        [RUNTIME_PROP]: KeepUpstream<
          [...ExtractStaticRuntimes<C>, Up<TContext>]
        >;
      }>;
      [RUNTIME_PROP]: [...ExtractStaticRuntimes<C>, Up<TContext>];
      [COMPONENT_PROP]: ExtractStaticComponent<C>;
      [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
    }
  >;

export function withUpstream<
  C extends React.FC<any>,
  R,
  TProps extends Record<string, unknown> | undefined,
>(
  Context: RuntimeContextReference<R>,
  getSource?: (
    api: { runtime: RuntimeApi<R> },
    props: Merge<React.ComponentProps<C>, ExtractStaticProps<C>>
  ) => TProps
) {
  return withUpstreamImpl(Context, getSource);
}
