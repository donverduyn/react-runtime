import { pipe } from 'effect';

export const connect: typeof pipe = (...args: any[]) => {
  return pipe(...(args as Parameters<typeof pipe>));
};
