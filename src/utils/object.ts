export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function deepEqual(
  objA: unknown,
  objB: unknown,
  options: { strict?: boolean } = {}
): boolean {
  if (objA === objB) return true;

  if (isPlainObject(objA) && isPlainObject(objB)) {
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;

      const valA = objA[key];
      const valB = objB[key];

      if (!deepEqual(valA, valB, options)) return false;
    }

    return true;
  }

  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) return false;

    for (let i = 0; i < objA.length; i++) {
      if (!deepEqual(objA[i], objB[i], options)) return false;
    }

    return true;
  }

  return false;
}

export const isShallowEqual = <T>(
  a: React.PropsWithChildren<T> | undefined | null,
  b: React.PropsWithChildren<T> | undefined | null
): boolean => {
  if (a === b) return true;
  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  )
    return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;

    // Skip 'children' comparison (optional: tweak this behavior if needed)
    if (key === 'children') continue;

    if (a[key as keyof typeof a] !== b[key as keyof typeof b]) return false;
  }

  return true;
};

type DeepClone<T> = T extends Primitive
  ? T
  : T extends Date
    ? Date
    : T extends RegExp
      ? RegExp
      : T extends Map<infer K, infer V>
        ? Map<DeepClone<K>, DeepClone<V>>
        : T extends Set<infer U>
          ? Set<DeepClone<U>>
          : T extends Array<infer U>
            ? DeepCloneArray<U>
            : T extends object
              ? DeepCloneObject<T>
              : T;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

interface DeepCloneArray<T> extends Array<DeepClone<T>> {}
type DeepCloneObject<T> = { [K in keyof T]: DeepClone<T[K]> };

export function cloneDeep<T>(
  value: T,
  seen = new WeakMap<object, unknown>()
): DeepClone<T> {
  if (value === null || typeof value !== 'object') return value as DeepClone<T>;

  if (seen.has(value as object))
    return seen.get(value as object) as DeepClone<T>;

  let cloned: unknown;

  if (Array.isArray(value)) {
    cloned = [] as DeepClone<T>;
    seen.set(value, cloned);
    for (const item of value as unknown[]) {
      (cloned as DeepClone<T>[]).push(cloneDeep(item, seen) as DeepClone<T>);
    }
  } else if (value instanceof Date) {
    cloned = new Date(value.getTime());
  } else if (value instanceof Map) {
    cloned = new Map() as DeepClone<T>;
    seen.set(value, cloned);
    value.forEach((v, k) => {
      (cloned as Map<DeepClone<unknown>, DeepClone<unknown>>).set(
        cloneDeep(k, seen),
        cloneDeep(v, seen)
      );
    });
  } else if (value instanceof Set) {
    cloned = new Set() as DeepClone<T>;
    seen.set(value, cloned);
    value.forEach((v) =>
      (cloned as Set<DeepClone<unknown>>).add(cloneDeep(v, seen))
    );
  } else if (value instanceof RegExp) {
    cloned = new RegExp(value.source, value.flags);
  } else {
    cloned = {} as DeepClone<T>;
    seen.set(value, cloned);
    const obj = value as Record<PropertyKey, unknown>;
    for (const key of Object.keys(obj)) {
      (cloned as Record<string, unknown>)[key] = cloneDeep(obj[key], seen);
    }
    for (const sym of Object.getOwnPropertySymbols(obj)) {
      (cloned as Record<symbol, unknown>)[sym] = cloneDeep(obj[sym], seen);
    }
  }

  return cloned as DeepClone<T>;
}

type DeepFreeze<T> = T extends (...args: any[]) => unknown
  ? T
  : T extends Array<infer U>
    ? ReadonlyArray<DeepFreeze<U>>
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<DeepFreeze<K>, DeepFreeze<V>>
      : T extends Set<infer U>
        ? ReadonlySet<DeepFreeze<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepFreeze<T[K]> }
          : T;

export function deepFreeze<T>(obj: T): DeepFreeze<T> {
  if (obj === null || typeof obj !== 'object') return obj as DeepFreeze<T>;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = deepFreeze(obj[i]) as T extends Array<infer U>
        ? DeepFreeze<U>
        : never;
    }
  } else if (obj instanceof Map) {
    obj.forEach((value, key) => {
      obj.set(
        key,
        deepFreeze(value) as T extends Map<infer _, infer V>
          ? DeepFreeze<V>
          : never
      );
    });
  } else if (obj instanceof Set) {
    const frozenValues: unknown[] = [];
    obj.forEach((value) => frozenValues.push(deepFreeze(value)));
    obj.clear();
    frozenValues.forEach((v) =>
      obj.add(v as T extends Set<infer U> ? DeepFreeze<U> : never)
    );
  } else {
    const keys = [
      ...Object.getOwnPropertyNames(obj),
      ...Object.getOwnPropertySymbols(obj),
    ];
    for (const key of keys) {
      const val = (obj as Record<string | symbol, unknown>)[key];
      (obj as Record<string | symbol, unknown>)[key] = deepFreeze(val);
    }
  }

  return Object.freeze(obj) as DeepFreeze<T>;
}
