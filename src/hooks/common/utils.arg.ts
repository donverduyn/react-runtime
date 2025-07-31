// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Effect, ManagedRuntime } from 'effect';
import type { RuntimeContext, RuntimeInstance } from 'components/common/types';
import type { RuntimeKey } from 'hooks/useRuntimeProvider/types';
import { isReactContext } from 'utils/react';
import { isRuntimeInstance, isRuntimeModule } from 'utils/runtime';

export type Fallback<T, U> = [T, U] extends [infer A, infer B]
  ? unknown extends A
    ? B
    : A
  : never;

export type Fallback2<T extends unknown[], U extends unknown[]> = [
  T,
  U,
] extends [infer A extends unknown[], infer B extends unknown[]]
  ? unknown[] extends A
    ? B
    : A
  : never;

const noRuntimeMessage = `No runtime available. 
  Did you forget to wrap your component using WithRuntime?
  `;

export const getDeps = (input: any, deps: React.DependencyList) =>
  (Effect.isEffect(input)
    ? deps
    : Array.isArray(input)
      ? input
      : deps) as React.DependencyList;

export const getRuntimeInstance = <R, R1>(
  input: any,
  localContext: RuntimeContext<any>,
  instances: Map<RuntimeKey, RuntimeInstance<any>>
) => {
  const result = (
    isRuntimeInstance(input)
      ? input
      : isRuntimeModule(input)
        ? instances.get(input.key)
        : Effect.isEffect(input)
          ? instances.get(localContext.key)
          : undefined
  ) as RuntimeInstance<R | R1> | undefined;

  if (result === undefined) {
    throw new Error(noRuntimeMessage);
  } else {
    return result;
  }
};

// type EffectFn<Args extends any[], R> = (...args: Args) => R;

export const getEffectFn = <Args extends unknown[], Result>(
  input: unknown,
  fnOrDeps: unknown
): ((...args: Args) => Result) => {
  if (
    !ManagedRuntime.isManagedRuntime(input) &&
    !Effect.isEffect(input) &&
    !isReactContext(input)
  ) {
    return input as (...args: Args) => Result;
  }

  if (typeof fnOrDeps === 'function') {
    return fnOrDeps as (...args: Args) => Result;
  }

  return (() => Effect.void as unknown as Result) as (...args: Args) => Result;
};
// export const getEffectFn = <T>(input: any, fnOrDeps: any) =>
//   (!ManagedRuntime.isManagedRuntime(input) &&
//   !Effect.isEffect(input) &&
//   !isReactContext(input)
//     ? input
//     : typeof fnOrDeps === 'function'
//       ? fnOrDeps
//       : () => Effect.void) as T;

export const getEffect = <T>(input: any, effectOrDeps: any) =>
  (Effect.isEffect(input) && !ManagedRuntime.isManagedRuntime(input)
    ? input
    : Effect.isEffect(effectOrDeps)
      ? effectOrDeps
      : Effect.void) as T;
