import * as React from 'react';
import { isPlainObject } from './../object';

export { createChildrenSketch } from './children';

export function isReactNode(value: unknown): value is React.ReactNode {
  // Fast path for primitives and null/undefined
  const type = typeof value;

  if (
    type === 'string' ||
    type === 'number' ||
    type === 'bigint' ||
    type === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return true;
  }

  // React Element
  if (React.isValidElement(value)) return true;

  // React Portal
  if (isReactPortal(value)) return true;

  // Promise (React 19 async rendering support)
  if (isPromise(value)) return true;

  // Array (fast path for common case)
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!isReactNode(value[i])) return false;
    }
    return true;
  }

  // Generic Iterable<ReactNode>
  if (isIterable(value)) {
    for (const item of value) {
      if (!isReactNode(item)) return false;
    }
    return true;
  }

  return false;
}

function isPromise(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (value as { then: () => any }).then === 'function' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (value as { catch: () => any }).catch === 'function'
  );
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Iterable<unknown>)[Symbol.iterator] === 'function'
  );
}

function isReactPortal(value: unknown): value is React.ReactPortal {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { key: unknown }).key !== 'undefined' &&
    typeof (value as { children: unknown }).children !== 'undefined' &&
    typeof (value as { containerInfo: unknown }).containerInfo !== 'undefined'
  );
}

export function isReactContext2<T>(
  variable: unknown
): variable is React.Context<T> {
  return (
    isPlainObject(variable) &&
    React.isValidElement(variable.Provider) &&
    React.isValidElement(variable.Consumer)
  );
}

export const isReactContext = <T,>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variable: any
): variable is typeof variable extends T ? T : never => {
  return (
    isPlainObject(variable) &&
    // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // // @ts-expect-error $$typeof is a private property
    variable.$$typeof === React.createContext(null).$$typeof
  );
};

export type ExtractMeta<T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends React.FC<any> ? Omit<T, keyof React.FC> : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDisplayName = <C extends React.FC<any> | undefined>(
  Component: C,
  prefix?: string
) => {
  const extraField = (
    Component as unknown as { type?: { name?: string } } | undefined
  )?.type?.name;
  const componentName =
    (Component && (Component.displayName || Component.name || extraField)) ||
    'Component';
  return prefix ? `${prefix}(${componentName})` : componentName;
};

// based on https://github.com/mridgway/hoist-non-react-statics/blob/master/src/index.js
const hoistBlackList = {
  $$typeof: true,
  compare: true,
  // Don't redefine `displayName`,
  // it's defined as getter-setter pair on `memo` (see #3192).
  displayName: true,
  render: true,
  type: true,
};

export function copyStaticProperties(
  base: Record<string, unknown>,
  target: unknown
) {
  // const properties = Object.entries(base).reduce<Record<string, unknown>>(
  //   (acc, [key, value]) => {
  //     if (!hoistBlackList[key as keyof typeof hoistBlackList]) {
  //       acc[key] = value;
  //     }
  //     return acc;
  //   },
  //   {}
  // );
  // Object.assign(target, properties);
  Object.keys(base).forEach(function (key) {
    if (!hoistBlackList[key as keyof typeof hoistBlackList]) {
      Object.defineProperty(
        target,
        key,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error not allowed
        Object.getOwnPropertyDescriptor(base, key)
      );
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createElement = <C extends React.FC<any> | undefined>(
  Component: C,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mergedProps: C extends React.FC<any>
    ? React.ComponentProps<C>
    : Record<never, never>
) => (Component ? <Component {...mergedProps} /> : null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractMeta = <C extends React.FC<any>>(Component: C) =>
  Object.getOwnPropertyNames(Component)
    .filter(
      (() => {
        const skip = Object.getOwnPropertyNames(() => {});
        return (key) => !skip.includes(key);
      })()
    )
    .reduce(
      (acc, key) => Object.assign(acc, { [key]: Component[key as keyof C] }),
      {} as ExtractMeta<C>
    );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isFunctionalComponent = (fn: (...args: any[]) => any) => {
  try {
    const result = fn({}) as unknown;
    return isReactNode(result);
  } catch {
    return false;
  }
};
/**
 * Throws if called outside a React render phase.
 * Use this in runtime-level helpers like `useFn`, `useRun`, etc.
 * Only runs in dev mode and in the browser.
 */
// export function validateReactRenderPhase(callerName = 'runtime hook'): void {
//   if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
//     const dispatcher = (
//       React as unknown as Record<
//         string,
//         Record<string, Record<string, unknown> | null>
//       >
//     );

//     console.log(dispatcher)
//     if (!dispatcher || dispatcher.current == null) {
//       throw new Error(
//         `[validateReactRenderPhase] Invalid call to "${callerName}": must be called during a React render phase (e.g., inside a component or custom hook).`
//       );
//     }
//   }
// }
