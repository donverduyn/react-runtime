import { Effect, Stream } from 'effect';
import { hasProperty } from 'effect/Predicate';
import { StreamTypeId } from 'effect/Stream';

export const isStream = <A, E, R>(u: unknown): u is Stream.Stream<A, E, R> =>
  hasProperty(u, StreamTypeId) || Effect.isEffect(u);
