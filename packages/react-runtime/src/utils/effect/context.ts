// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Effect, Stream } from 'effect';
import type { Tag, TagClass } from 'effect/Context';

export type InferSuccess<T> =
  T extends Effect.Effect<infer A, infer E, infer R>
    ? A
    : T extends Stream.Stream<infer A, infer E, infer R>
      ? A
      : T;

export type InferContext<
  T extends Stream.Stream<any, any, any> | Effect.Effect<any, any, any>,
> =
  T extends Effect.Effect<infer A, infer E, infer R>
    ? R
    : T extends Stream.Stream<infer A, infer E, infer R>
      ? R
      : never;

export type IsTag<T> =
  T extends Tag<infer I, infer V>
    ? Tag<I, V>
    : T extends TagClass<infer S, infer I, infer V>
      ? TagClass<S, I, V>
      : never;
