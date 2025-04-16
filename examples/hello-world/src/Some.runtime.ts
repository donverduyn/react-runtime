import { pipe, Layer, Console } from 'effect';
import { createRuntimeContext } from '../../../src/utils/context';
import { Some } from './Some';

export const reference = () => Some;

export const context = pipe(
  Layer.scopedDiscard(Console.log('Hello world!')),
  createRuntimeContext
);
