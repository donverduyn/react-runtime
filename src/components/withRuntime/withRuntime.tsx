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
  ExtractStaticUpstream,
  Down,
  ProviderConfigFn,
} from 'components/common/providerFactory/types';
import { type ExtractMeta } from 'utils/react';

const withRuntimeImpl = providerFactory('runtime', 'withRuntime');

export function withRuntime<
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
      [UPSTREAM_PROP]: ExtractStaticUpstream<C>;
      [PROVIDERS_PROP]: [...ExtractStaticProviders<C>, Down<TContext>];
      [COMPONENT_PROP]: ExtractStaticComponent<C>;
      [PROPS_PROP]: Merge<ExtractStaticProps<C>, TProps>;
    }
  >;

// export function withRuntime<TTarget, C extends React.FC<any>>(
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
 * @param Context A runtime context reference with a `.context` and `.reference()` method
 * @param configFn A function that receives runtime API + configure and returns props
 * @returns A higher-order component that wraps `C`, injects props, and manages runtime
 *
 * @example
 * ```tsx
 * export const Child = pipe(
 *   ChildView,
 *   withRuntime(UserRuntime, ({ configure }) => {
 *     const user = configure().runtime.use(UserTags.CurrentUser);
 *     return { user };
 *   })
 * );
 * ```
 */
export function withRuntime<
  C extends React.FC<any>,
  R,
  TProps extends
    | (Partial<React.ComponentProps<C>> & { [key: string]: unknown })
    | undefined,
>(Context: RuntimeModule<R>, configFn?: ProviderConfigFn<R, C, TProps>) {
  return withRuntimeImpl(Context, configFn);
}
