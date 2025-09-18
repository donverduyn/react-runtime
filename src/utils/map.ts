/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function combineSetsFromMap<T>(map: Map<any, Set<T>>): Set<T> {
  const combined = new Set<T>();
  for (const set of map.values()) {
    for (const item of set) {
      combined.add(item);
    }
  }
  return combined;
}

export function mergeSetsFromMaps<K, T>(
  mapA: Map<K, Set<T>>,
  mapB: Map<K, Set<T>>
): Map<K, Set<T>> {
  const result = new Map<K, Set<T>>();

  // Add all keys from mapA
  for (const [key, setA] of mapA) {
    const setB = mapB.get(key);
    const merged = new Set<T>(setA); // copy setA
    if (setB) {
      for (const item of setB) {
        merged.add(item);
      }
    }
    result.set(key, merged);
  }

  // Add keys that exist only in mapB
  for (const [key, setB] of mapB) {
    if (!mapA.has(key)) {
      result.set(key, new Set(setB)); // copy setB
    }
  }

  return result;
}

type AnyMap = Map<any, any>;

export function deepMergeMapsInPlace<A extends AnyMap, B extends AnyMap>(
  mapA: A,
  mapB: B
): A {
  for (const [key, valueB] of mapB) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const valueA = mapA.get(key);

    if (valueA instanceof Map && valueB instanceof Map) {
      // Recurse for nested maps
      deepMergeMapsInPlace(valueA, valueB);
    } else if (valueA instanceof Set && valueB instanceof Set) {
      // Merge sets
      valueB.forEach((item) => valueA.add(item));
    } else {
      // Otherwise overwrite or take from mapB
      mapA.set(key, valueB);
    }
  }

  return mapA;
}

export function cloneNestedMap<M extends Map<any, any>>(map: M): M {
  const result = new Map();
  for (const [key, value] of map.entries()) {
    if (value instanceof Map) {
      result.set(key, cloneNestedMap(value));
    } else {
      result.set(key, value);
    }
  }
  return result as M;
}
