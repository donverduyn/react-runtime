import { pipe, Layer, Console } from 'effect';
import { createRuntimeContext } from '../../../src/utils/runtime';
import { Foo } from './Foo';

export const reference = () => Foo;

export const context = pipe(
  Layer.scopedDiscard(Console.log('Hello world!')),
  createRuntimeContext({})
);
