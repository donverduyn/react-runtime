/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import type { Simplify, Merge, SetOptional } from 'type-fest';
import { providerFactory } from 'components/common/providerFactory/providerFactory';
import type {
  PROVIDERS_PROP,
  ExtractStaticProviders as ExtractStaticProviders,
  COMPONENT_PROP,
  ExtractStaticComponent,
  PROPS_PROP,
  ExtractStaticProps,
  UPSTREAM_PROP,
  ExtractStaticUpstream,
  PropsConfigFn,
} from 'types';
import { type ExtractMeta } from 'utils/react';

const withPropsImpl = providerFactory('props', 'withProps');

export function withProps<
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
  C extends React.FC<any>,
>(
  configFn: PropsConfigFn<C, TProps>
): (Component: C) => React.FC<
  Simplify<{ id: string } & SetOptional<React.ComponentProps<C>, keyof TProps>>
> &
  Merge<
    ExtractMeta<C>,
    {
      [UPSTREAM_PROP]: ExtractStaticUpstream<C>;
      [PROVIDERS_PROP]: ExtractStaticProviders<C>;
      [COMPONENT_PROP]: ExtractStaticComponent<C>;
      [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
    }
  >;

// export function withProps<TTarget, C extends React.FC<any>>(
//   Context: RuntimeContextReference<TTarget>,
//   getSource?: (
//     api: {
//       configure: (config?: Partial<Config>) => RuntimeApi<TTarget>;
//       runtime: RuntimeApi<TTarget>;
//     },
//     props: Simplify<Partial<React.ComponentProps<C>>>
//   ) => void
// ): (
//   Component: C
// ) => React.FC<Simplify<React.ComponentProps<C>>> & Simplify<ExtractMeta<C>>;

/**
 * Injects a **local runtime** into the wrapped component.
 *
 * This HOC:
 * - Instantiates the runtime **locally at the leaf**, if it doesn't exist upstream
 * - Injects runtime hooks (`use`, `useFn`, `useRun`) and provides values as props
 * - Ensures proper lifecycle management and disposal based on the config
 * - Merges props returned from the `getSource` function into the component
 * - Automatically deduplicates and lifts runtime providers to where they're needed
 *
 * @template TProps Props returned from the `getSource` function
 * @template C The original React component
 * @template TContext A branded runtime context reference
 * @template R The effect runtime environment type
 *
 * @param configFn A function that receives runtime API + configure and returns props
 * @returns A higher-order component that wraps `C`, injects props, and manages runtime
 *
 * @example
 * ```tsx
 * export const Child = pipe(
 *   ChildView,
 *   withProps((props) => ({
 *      foo: props.bar
 *   }))
 * );
 * ```
 */
export function withProps<
  C extends React.FC<any>,
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
>(configFn: PropsConfigFn<C, TProps>) {
  return withPropsImpl(configFn);
}
