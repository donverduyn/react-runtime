import { createRuntimeContext, getPropTag } from '@donverduyn/react-runtime';
import { Effect, pipe, Stream } from 'effect';
import { type Props, providers } from './Child';

const { PropService } = getPropTag<Props>();
// const { from } = Providers;

export class ChildText extends Effect.Service<ChildText>()('Child/Count', {
  effect: Effect.gen(function* () {
    const { text } = yield* PropService;
    // const stream = yield* from.App.AppCounter;
    return text.pipe(Stream.map((y) => y.toUpperCase()));
  }),
}) {}

const layer = pipe(ChildText.Default);

export const ChildRuntime = createRuntimeContext({
  name: 'ChildRuntime',
  providers: () => providers,
})(layer);
