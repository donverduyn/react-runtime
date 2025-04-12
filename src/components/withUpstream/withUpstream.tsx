// import * as React from 'react';
// import { type Layer } from 'effect';
// import { useRuntimeInstance } from 'hooks/useRuntimeInstance';
// import type { RuntimeContext, Config } from 'utils/context';
// import { copyStaticProperties, extractMeta, getDisplayName } from 'utils/react';

export const withUpstream = () => {
  return <div>withUpstream</div>;
};

// const UPSTREAM_KEY = '__runtimes';

// export const WithUpstream =
//   <R,>(Context: RuntimeContext<R>) =>
//   <C extends React.FC<any>>(Component: C): C => {
//     const { layer } = Context as unknown as {
//       layer: Layer.Layer<R>;
//     };

//     const meta = extractMeta(Component);

//     const existing = (meta[UPSTREAM_KEY as keyof typeof meta] ??
//       []) as RuntimeContext<any>[];
//     const base = Object.assign({}, meta, {
//       [UPSTREAM_KEY]: existing.concat(Context),
//     });

//     const Wrapper = (
//       props: React.ComponentProps<C> & {
//         readonly __render: (cmp: C) => React.ElementType | null;
//       }
//     ) => {
//       // console.log('withUpstream', props);
//       const { __render, ...rest } = props;
//       const finalRender = (__render ?? (() => null)) as (
//         cmp: C,
//         props: React.ComponentProps<C>
//       ) => React.ReactNode | null;

//       const upstream = React.use(Context);
//       const config: Config = {
//         componentName: getDisplayName(Component, 'WithUpStream'),
//         debug: true,
//         postUnmountTTL: 1000,
//       };

//       // we always create a new runtime, but use an inert factory to prevent instantiation
//       // because we can't guarantee the number of hook calls otherwise.
//       const runtime = useRuntimeInstance(layer, config);
//       const Result = finalRender(Component, props);

//       return upstream !== undefined ? (
//         (Result ?? <Component {...(rest as React.ComponentProps<C>)} />)
//       ) : (
//         // this is the fallback for testing/storybook
//         <Context.Provider value={runtime}>
//           {Result ?? <Component {...(rest as React.ComponentProps<C>)} />}
//         </Context.Provider>
//       );
//     };

//     copyStaticProperties(base, Wrapper);
//     Wrapper.displayName = getDisplayName(Component, 'WithUpstream');
//     return Wrapper as C;
//   };
