/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Layer } from 'effect';
import type { Simplify, IsAny } from 'type-fest';
import { createFn } from 'hooks/useFn';
import { createRun } from 'hooks/useRun';
import { useRuntimeInstance } from 'hooks/useRuntimeInstance';
import type { RuntimeInstance, RuntimeContext } from 'utils/context';
import {
  createElement,
  extractMeta,
  getDisplayName,
  copyStaticProperties,
  type ExtractMeta,
} from 'utils/react';
import { createUse } from './../../hooks/use';
/*
This HOC creates a runtime for the context and provides it to the component.
It allows any downstream components to access the runtime using the context.
*/

type Props = {
  readonly children?: React.ReactNode;
};

type RuntimeApi<R> = {
  runtime: RuntimeInstance<R>;
  use: ReturnType<typeof createUse<R>>;
  useFn: ReturnType<typeof createFn<R>>;
  useRun: ReturnType<typeof createRun<R>>;
};

type InferProps<C> = C extends React.FC<infer P> ? P : never;

type FallbackProps<C, P> =
  IsAny<InferProps<C>> extends false ? InferProps<C> : P;

type Config = {
  componentName: string;
  debug: boolean;
  // factory: <T>(layer: Layer.Layer<T>, id: string) => RuntimeInstance<T>;
  postUnmountTTL: number;
};

export function withRuntime<TTarget, TProps, C extends React.FC<any>>(
  Context: RuntimeContext<TTarget>,
  getSource: (
    runtimeFactory: (config?: Partial<Config>) => RuntimeApi<TTarget>,
    props: Simplify<Partial<React.ComponentProps<C>>>
  ) => TProps
  // fn: (props: Simplify<Omit<FallbackProps<C, Props>, keyof TProps>>) => void
): (
  Component?: C
) => React.FC<Simplify<Omit<FallbackProps<C, Props>, keyof TProps>>> &
  Simplify<ExtractMeta<C>>;

export function withRuntime<TTarget, C extends React.FC<any>>(
  Context: RuntimeContext<TTarget>,
  getSource?: (
    runtimeFactory: (config?: Partial<Config>) => RuntimeApi<TTarget>,
    props: Simplify<Partial<React.ComponentProps<C>>>
  ) => void
): (
  Component?: C
) => React.FC<Simplify<FallbackProps<C, Props>>> & Simplify<ExtractMeta<C>>;

//
// the goal is to have a utility that allows us to reuse the logic between the withRuntime hoc and the Runtime component that takes the runtime as a prop. Later on we might want to consider the Runtime component to be used in JSX in more scenarios, but for now it is limited to usage in storybook decorators

export function withRuntime<
  C extends React.FC<any>,
  TTarget,
  TProps extends Record<string, unknown> | undefined,
>(
  Context: RuntimeContext<TTarget>,
  getSource?: (
    runtimeFactory: (config?: Partial<Config>) => RuntimeApi<TTarget>,
    props: Partial<FallbackProps<C, Props>>
  ) => TProps
) {
  return (Component?: C) => {
    const Wrapper: React.FC<Partial<FallbackProps<C, Props>>> = (props) => {
      // const contexts = Component?.__runtimes ?? [];
      // const currentRender = props.__render as RenderFn<C>['__render'];
      // const withUpstreamCtx = Component?.__runtimes !== undefined;
      const { layer } = Context as unknown as {
        layer: Layer.Layer<TTarget>;
      };

      const createSource = React.useCallback(() => {
        let runtimeRef = null as RuntimeInstance<TTarget> | null;
        let upstreamRef = null as RuntimeInstance<TTarget> | null;
        const config: Config = {
          componentName: getDisplayName(Component, 'WithRuntime'),
          debug: false,
          postUnmountTTL: 1000,
        };

        const source = getSource
          ? getSource((overrides) => {
              const safeConfig = Object.assign(config, overrides ?? {});
              const upstream = React.use(Context);

              // eslint-disable-next-line react-hooks/rules-of-hooks
              const runtime = upstream ?? useRuntimeInstance(layer, safeConfig);
              runtimeRef = upstream ?? runtime;
              upstreamRef = upstream ?? null;
              return {
                runtime: upstream ?? runtime,
                use: createUse(Context, runtime),
                useFn: createFn(Context, runtime),
                useRun: createRun(Context, runtime),
              };
            }, props)
          : undefined;

        if (!getSource || runtimeRef === null) {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          runtimeRef = useRuntimeInstance(layer, config);
        }

        return [source ?? {}, runtimeRef, upstreamRef !== null] as const;
      }, [layer, props]);

      const [source, runtime, hasUpstreamInstance] = createSource();

      // this allows context injection when withUpstreamCtx is true
      // const __render = React.useCallback(
      //   (Previous: C, props: React.ComponentProps<C>) => {
      // nothing to inject from withRuntime
      // return currentRender
      //   ? currentRender(
      //       (() => {
      //         if (hasUpstreamInstance) return <Previous {...props} />;
      //         return (
      //           <Context.Provider value={runtime!}>
      //             <Previous {...props} />
      //           </Context.Provider>
      //         );
      //       }) as unknown as C,
      //       props
      //     )
      //   : null;
      // return <Previous {...props} />
      // return null;
      // if (hasUpstreamInstance) return <Previous {...props} />;
      //     return (
      //       <Context.Provider value={runtime!}>
      //         <div style={{ background: 'red' }}>
      //           <Previous {...props} />
      //         </div>
      //       </Context.Provider>
      //     );
      //   },
      //   [hasUpstreamInstance, runtime]
      // );

      // const mergedProps = getSource
      //   ? Object.assign(source, props, { __render })
      //   : Object.assign({}, props, { __render });

      const mergedProps = getSource
        ? Object.assign(source, props)
        : Object.assign({}, props);

      const children =
        createElement(Component, mergedProps) ??
        (props.children as React.ReactNode) ??
        null;
      if (hasUpstreamInstance) return children;
      // return children;
      return <Context.Provider value={runtime}>{children}</Context.Provider>;
    };
    const meta = Component ? extractMeta(Component) : {};
    const MemoWrapper = React.memo(Wrapper);
    MemoWrapper.displayName = getDisplayName(Component, 'WithRuntime');
    copyStaticProperties(meta, MemoWrapper);
    return MemoWrapper;
  };
}

// const createMergeFn = () => {}
// const createExhaustFn = () => {}
// const createSwitchFn = () => {}

/* eslint-enable @typescript-eslint/no-explicit-any */
