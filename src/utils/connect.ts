import { pipe } from 'effect';

export const connect = (...args: Parameters<typeof pipe>) => {
  return pipe(...args);
};
