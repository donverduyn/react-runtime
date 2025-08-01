import { createRuntimeContext } from '@donverduyn/react-runtime';
import { pipe, Layer, Context } from 'effect';
import { Child } from './Child';

export const reference = () => Child;

export class Foo extends Context.Tag('Child/Foo')<Foo, string>() {}

export class Name extends Context.Tag('Child/Name')<Name, string>() {}

export const context = pipe(
  Layer.succeed(Name, 'world'),
  Layer.merge(Layer.succeed(Foo, 'foo')),
  createRuntimeContext()
);
