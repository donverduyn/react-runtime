import { createRuntimeContext } from '@donverduyn/react-runtime';
import { pipe, Layer } from 'effect';
import { Child } from './Child';
import * as Tags from './Child.tags';

export const reference = () => Child;

export const context = pipe(
  Layer.succeed(Tags.Name, 'world'),
  createRuntimeContext
);
