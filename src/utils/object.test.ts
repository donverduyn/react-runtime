import { describe, it, expect } from 'vitest';
import { cloneDeep, deepFreeze } from './object';

describe('Object utils', () => {
  it('clones primitives correctly', () => {
    expect(cloneDeep(42)).toBe(42);
    expect(cloneDeep('hello')).toBe('hello');
    expect(cloneDeep(true)).toBeTruthy();
    expect(cloneDeep(null)).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(cloneDeep(undefined)).toBeUndefined();
  });

  it('clones arrays deeply', () => {
    const arr: Array<number | { a: number }> = [1, { a: 2 }];
    const cloned = cloneDeep(arr);
    expect(cloned).toStrictEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[1]).not.toBe(arr[1]);
  });

  it('clones objects deeply', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = cloneDeep(obj);
    expect(cloned).toStrictEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it('clones nested Maps correctly', () => {
    const map: Map<string, number | Map<string, number>> = new Map();
    map.set('a', 1);
    map.set('b', new Map([['c', 2]]));
    const cloned = cloneDeep(map);
    expect(cloned).not.toBe(map);
    const b = cloned.get('b');
    expect(b).toBeInstanceOf(Map);
    expect((b as Map<string, number>).get('c')).toBe(2);
  });

  it('clones nested Sets correctly', () => {
    const innerSet: Set<number> = new Set([1, 2]);
    const set: Set<number | Set<number>> = new Set([0, innerSet]);
    const cloned = cloneDeep(set);
    expect(cloned).not.toBe(set);
    expect(cloned.has(0)).toBeTruthy();
    const clonedInner = [...cloned].find(
      (v) => v instanceof Set
    ) as Set<number>;
    expect(clonedInner).not.toBe(innerSet);
    expect([...clonedInner]).toStrictEqual([1, 2]);
  });

  it('clones complex nested structures', () => {
    const complex = {
      arr: [1, { a: new Set([2, 3]) }],
      map: new Map([['key', { b: [4, 5] }]]),
    };

    const cloned = cloneDeep(complex);

    // Deep equality
    expect(cloned).toStrictEqual(complex);

    // Assert objects in array are cloned
    const originalObj = complex.arr[1];
    const clonedObj = cloned.arr[1];
    expect(clonedObj).not.toBe(originalObj);

    // Compare Set reference
    expect(
      typeof clonedObj === 'object' && 'a' in clonedObj && clonedObj.a
    ).not.toBe(
      typeof originalObj === 'object' && 'a' in originalObj && originalObj.a
    );

    // Compare Set values
    expect(
      typeof clonedObj === 'object' && 'a' in clonedObj
        ? Array.from(clonedObj.a)
        : []
    ).toStrictEqual(
      typeof originalObj === 'object' && 'a' in originalObj
        ? Array.from(originalObj.a)
        : []
    );

    // Assert Map and its values are cloned
    const originalMapValue = complex.map.get('key')!;
    const clonedMapValue = cloned.map.get('key')!;
    expect(clonedMapValue).not.toBe(originalMapValue);
    expect(clonedMapValue.b).not.toBe(originalMapValue.b);
    expect(clonedMapValue.b).toStrictEqual(originalMapValue.b);
  });

  it('handles circular references', () => {
    type Circular = { a: number; self?: Circular };
    const obj: Circular = { a: 1 };
    obj.self = obj;
    const cloned = cloneDeep(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.a).toBe(1);
    expect(cloned.self).toBe(cloned);
  });
});

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

describe.todo('deepFreeze', () => {
  it('should freeze a simple object', () => {
    const obj = { a: 1, b: 2 };
    const frozen = deepFreeze(obj);

    expect(Object.isFrozen(frozen)).toBeTruthy();
    expect(Object.isFrozen(frozen.a)).toBeTruthy(); // primitives are immutable, but safe
  });

  it('should recursively freeze nested objects', () => {
    const obj = { a: { b: 2 }, c: 3 };
    const frozen = deepFreeze(obj);

    expect(Object.isFrozen(frozen)).toBeTruthy();
    expect(Object.isFrozen(frozen.a)).toBeTruthy();
  });

  it('should freeze arrays inside objects', () => {
    const obj = { arr: [1, 2, 3] };
    const frozen = deepFreeze(obj);

    expect(Object.isFrozen(frozen)).toBeTruthy();
    expect(Object.isFrozen(frozen.arr)).toBeTruthy();
  });

  it('should throw when trying to modify frozen object', () => {
    const obj = { a: 1 };
    const frozen = deepFreeze(obj);

    expect(() => {
      (frozen as Mutable<typeof frozen>).a = 2;
    }).toThrow(Error);
  });

  it('should handle null and undefined', () => {
    expect(deepFreeze(null)).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(deepFreeze(undefined)).toBeUndefined();
  });
});
