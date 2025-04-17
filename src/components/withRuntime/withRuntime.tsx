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
  Config,
  PROPS_PROP,
  ExtractStaticProps,
  UPSTREAM_PROP,
  ExtractStaticUpstream,
  Down,
} from 'components/common/types';
import { type ExtractMeta } from 'utils/react';

export function withRuntime<TProps, C extends React.FC<any>, TContext, R>(
  Context: TContext & RuntimeContextReference<R>,
  getSource: (
    api: {
      configure: (config?: Partial<Config>) => RuntimeApi<R>;
      runtime: RuntimeApi<R>;
    },
    props: Simplify<Partial<React.ComponentProps<C>>>
  ) => TProps
): (Component: C) => React.FC<
  Simplify<Omit<React.ComponentProps<C>, keyof TProps>>
> &
  Merge<
    ExtractMeta<C>,
    {
      [UPSTREAM_PROP]: ExtractStaticUpstream<C>;
      [RUNTIME_PROP]: [...ExtractStaticRuntimes<C>, Down<TContext>];
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
 * @param getSource A function that receives runtime API + configure and returns props
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
  TProps extends Record<string, unknown> | undefined,
>(
  Context: RuntimeContextReference<R>,
  getSource?: (
    api: {
      configure: (config?: Partial<Config>) => RuntimeApi<R>;
      runtime: RuntimeApi<R>;
    },
    props: Partial<React.ComponentProps<C>>
  ) => TProps
) {
  const hoc = hocFactory('runtime', 'withRuntime');
  return hoc(Context, getSource);
}
