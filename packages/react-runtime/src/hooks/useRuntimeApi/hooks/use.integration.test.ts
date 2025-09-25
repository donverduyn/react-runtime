import { renderHook } from '@testing-library/react';
import { Context, Layer, ManagedRuntime } from 'effect';
import type { RuntimeInstance } from 'types';
import { createProxy, createRuntimeContext } from 'utils/effect';
import { createUse } from './use';

describe('use', () => {
  it('should pass', () => {
    expect(true).toBeTruthy();
  });
  it('should make state synchronously available, and update async on stream emissions', () => {
    class Tag extends Context.Tag('Tag')<Tag, string>() {}
    const context = createRuntimeContext({ name: 'test' })(
      Layer.succeed(Tag, 'foo')
    );
    const instance: RuntimeInstance<Tag> = {
      config: {} as never,
      runtime: ManagedRuntime.make(context.layer),
      propsProxy: createProxy({}),
    };
    const instances = new Map<symbol, RuntimeInstance<Tag>>();
    instances.set(context.key, instance);

    // const createUse = () => (effect) => instance.runtime.runSync(effect)

    const use = createUse(context, instances);
    const { result } = renderHook(() => use(Tag));

    expect(result.current).toBe('foo');
  });
});
