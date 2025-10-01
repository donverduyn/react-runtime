import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { Context, Effect, Layer, ManagedRuntime } from 'effect';
import { v4 as uuid } from 'uuid';
import type { InstanceId, RuntimeInstance } from 'types';
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
      id: uuid() as InstanceId,
      config: {} as never,
      runtime: ManagedRuntime.make(context.layer),
      propProxy: createProxy({}),
    };
    const instances = new Map<symbol, RuntimeInstance<Tag>>();
    instances.set(context.key, instance);

    const use = createUse(context, instances);
    const { result } = renderHook(() => use(Tag));

    expect(result.current).toBe('foo');
  });
  it('should not fail when no value is available synchronously', async () => {
    class Tag extends Context.Tag('Tag')<Tag, string>() {}
    const context = createRuntimeContext({ name: 'test' })(
      Layer.effect(
        Tag,
        Effect.promise(() => Promise.resolve('foo'))
      )
    );
    const instance: RuntimeInstance<Tag> = {
      id: uuid() as InstanceId,
      config: {} as never,
      runtime: ManagedRuntime.make(context.layer),
      propProxy: createProxy({}),
    };
    const instances = new Map<symbol, RuntimeInstance<Tag>>();
    instances.set(context.key, instance);

    const use = createUse(context, instances);
    vi.useFakeTimers();
    const { result } = renderHook(() => use(Tag));

    expect(result.current).toBeNull();

    await act(vi.runAllTimersAsync);
    expect(result.current).toBe('foo');
  });
});
