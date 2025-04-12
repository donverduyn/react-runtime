// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Effect, ManagedRuntime } from 'effect';
import { RuntimeContext, RuntimeInstance } from 'utils/context';
import { isReactContext } from 'utils/react';

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

export const getRuntime = <R, R1>(
  input: any,
  localContext: any,
  localRuntime: any
) => {
  const result = (
    isReactContext<RuntimeContext<R1>>(input)
      ? input !== localContext
        ? React.use(input)
        : localRuntime
      : ManagedRuntime.isManagedRuntime(input)
        ? input
        : localRuntime
  ) as RuntimeInstance<R | R1> | undefined;

  if (result === undefined) {
    throw new Error(noRuntimeMessage);
  } else {
    return result;
  }
};

export const getEffectFn = <T>(input: any, fnOrDeps: any) =>
  (!ManagedRuntime.isManagedRuntime(input) &&
  !Effect.isEffect(input) &&
  !isReactContext(input)
    ? input
    : typeof fnOrDeps === 'function'
      ? fnOrDeps
      : () => Effect.void) as T;

export const getEffect = <T>(input: any, effectOrDeps: any) =>
  (Effect.isEffect(input) && !ManagedRuntime.isManagedRuntime(input)
    ? input
    : Effect.isEffect(effectOrDeps)
      ? effectOrDeps
      : Effect.void) as T;
