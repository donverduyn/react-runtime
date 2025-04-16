import { createRuntimeContext } from '@donverduyn/react-runtime';
import { pipe, Layer, Context } from 'effect';
import { Child } from './Child';
import * as Tags from './Child.tags';

export const reference = () => Child;

export class Foo extends Context.Tag('Child/Foo')<Foo, string>() {}

export const context = pipe(
  Layer.succeed(Tags.Name, 'world'),
  Layer.merge(Layer.succeed(Foo, 'foo')),
  createRuntimeContext
);
