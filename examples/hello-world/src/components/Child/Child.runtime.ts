import { createRuntimeContext, getPropTag } from '@donverduyn/react-runtime';
import { Effect, pipe, Stream, Context } from 'effect';
import type { Props } from './Child';

const { PropService } = getPropTag<Props>()(Context.Tag);

export class ChildText extends Effect.Service<ChildText>()('Child/Count', {
  effect: Effect.gen(function* () {
    const { text } = yield* PropService;
    return text.pipe(Stream.map((y) => y.toUpperCase()));
  }),
}) {}

const layer = pipe(ChildText.Default);

export const ChildRuntime = createRuntimeContext({ name: 'ChildRuntime' })(
  layer
);
