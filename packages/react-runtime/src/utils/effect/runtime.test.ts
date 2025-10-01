import * as React from 'react';
import { Layer, ManagedRuntime, Effect, Context } from 'effect';
import { describe, it, expect } from 'vitest';
import { isFunctionalComponent } from '@/utils/react';
import { tryFnSync } from 'utils/function';
import { isRuntimeContext } from './runtime';

// Dummy React components for testing
const FunctionalComponent: React.FC = () => React.createElement('div');

describe('isComponent', () => {
  it('returns true for a functional React component', () => {
    expect(isFunctionalComponent(FunctionalComponent)).toBeTruthy();
  });

  it('returns false for a plain function', () => {
    function notAComponent() {
      return Symbol('not-a-component');
    }

    expect(isFunctionalComponent(notAComponent)).toBeFalsy();
  });

  it('returns false for a non-function value', () => {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-expect-error Testing non-function values
    expect(isFunctionalComponent({})).toBeFalsy();
    // @ts-expect-error Testing non-function values
    expect(isFunctionalComponent(null)).toBeFalsy();
    // @ts-expect-error Testing non-function values
    expect(isFunctionalComponent(undefined)).toBeFalsy();
    // @ts-expect-error Testing non-function values
    expect(isFunctionalComponent(123)).toBeFalsy();
    // @ts-expect-error Testing non-function values
    expect(isFunctionalComponent('string')).toBeFalsy();
    /* eslint-enable @typescript-eslint/ban-ts-comment */
  });
});

describe('isRuntimeContext', () => {
  it('returns true for a valid RuntimeContext', () => {
    const layer = Layer.empty;
    const context = {
      key: Symbol('RuntimeContext'),
      layer,
    };
    expect(isRuntimeContext<number>(context)).toBeTruthy();
  });

  it('returns false for an object missing key or layer', () => {
    const layer = Layer.empty;
    expect(isRuntimeContext({ layer })).toBeFalsy();
    expect(isRuntimeContext({ key: Symbol('RuntimeContext') })).toBeFalsy();
  });

  it('returns false for invalid types', () => {
    expect(isRuntimeContext(null)).toBeFalsy();
    expect(isRuntimeContext(undefined)).toBeFalsy();
    expect(isRuntimeContext(123)).toBeFalsy();
    expect(isRuntimeContext('string')).toBeFalsy();
    expect(isRuntimeContext({})).toBeFalsy();
  });

  it('returns false if key is not a symbol', () => {
    const layer = Layer.empty;
    const context = {
      key: 'not-a-symbol',
      layer,
    };
    expect(isRuntimeContext(context)).toBeFalsy();
  });

  it('returns false if layer is not a Layer', () => {
    const context = {
      key: Symbol('RuntimeContext'),
      layer: {},
    };
    expect(isRuntimeContext(context)).toBeFalsy();
  });
});

class Tag extends Context.Tag('Tag')<Tag, number>() {}
const syncEffect = Effect.succeed(42);
const asyncEffect = Effect.promise(() => Promise.resolve(42));

describe('runSync behavior on runtime with async layers', () => {
  let runtime: ManagedRuntime.ManagedRuntime<never, never>;
  beforeEach(() => {
    const asyncLayer = Layer.effect(Tag, asyncEffect);
    runtime = ManagedRuntime.make(asyncLayer);
  });
  afterEach(() => runtime.dispose());

  it('with an async layer, runSync on the runtime always in the same tick', async () => {
    // runtime is only ready in the next tick
    const firstResult = tryFnSync(() => runtime.runSync(syncEffect));
    expect(firstResult).toBeInstanceOf(Error);

    // next tick
    await runtime.runPromise(Effect.sleep(0));

    // no issues
    const secondResult = tryFnSync(() => runtime.runSync(syncEffect));
    expect(secondResult).toBe(42);
  });
});

// describe('isRuntimeModule', () => {
//   it('returns true for a valid runtime module', () => {
//     const layer = Layer.empty;
//     const context = {
//       key: Symbol('RuntimeContext'),
//       layer,
//     };
//     const module = {
//       context,
//       reference: () => FunctionalComponent,
//     };
//     expect(isRuntimeModule<number>(module)).toBeTruthy();
//   });

//   it('returns false if context is invalid', () => {
//     const module = {
//       context: {},
//       reference: () => FunctionalComponent,
//     };
//     expect(isRuntimeModule(module)).toBeFalsy();
//   });

//   it('returns false for non-object input', () => {
//     expect(isRuntimeModule(null)).toBeFalsy();
//     expect(isRuntimeModule(undefined)).toBeFalsy();
//     expect(isRuntimeModule(123)).toBeFalsy();
//     expect(isRuntimeModule('string')).toBeFalsy();
//   });
// });
