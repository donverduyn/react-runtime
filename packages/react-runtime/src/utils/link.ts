import { pipe } from 'effect';

export const link: typeof pipe = (...args: any[]) => {
  return pipe(...(args as Parameters<typeof pipe>));
};
