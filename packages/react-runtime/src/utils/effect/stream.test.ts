import { Effect, Stream } from 'effect';
import { isStream } from './stream';

describe('stream utils', () => {
  it('should be true when stream is provided', () => {
    const stream = Stream.fromIterable([0]);
    const effect = Effect.succeed(0);

    expect(isStream(stream)).toBeTruthy();
    expect(isStream(effect)).toBeFalsy();
  });
});
