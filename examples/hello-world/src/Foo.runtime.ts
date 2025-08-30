import { createRuntimeContext } from '@donverduyn/react-runtime';
import { pipe, Layer, Console } from '@donverduyn/react-runtime';
import { Foo } from './Foo';

export const reference = () => Foo;

export const context = pipe(
  Layer.scopedDiscard(Console.log('Hello world!')),
  createRuntimeContext()
);
