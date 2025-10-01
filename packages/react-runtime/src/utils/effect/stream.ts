import { Effect, Stream } from 'effect';
import { hasProperty } from 'effect/Predicate';
import { StreamTypeId } from 'effect/Stream';
import type { InferSuccess } from './context';

// export const isStream = <U>(
//   u: U
// ): u is Exclude<
//   U & (U extends IsStream<U> ? IsStream<U> : never),
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   Effect.Effect<any, any, any>
// > => hasProperty(u, StreamTypeId) && !Effect.isEffect(u);

export const isStream = <U>(u: U): u is U & Stream.Stream<InferSuccess<U>> => {
  return hasProperty(u, StreamTypeId) && !Effect.isEffect(u);
};

export const isStreamEffect = <A, E, R>(
  u: Effect.Effect<A, E, R>
): Effect.Effect<boolean> => Effect.sync(() => isStream(u));

export type IsStream<T> =
  T extends Stream.Stream<infer A, infer E, infer R>
    ? Stream.Stream<A, E, R>
    : never;
