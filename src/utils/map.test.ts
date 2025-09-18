import { deepMergeMapsInPlace } from './map';

const createNestedMap = <T>(mapAKey: number, mapBKey: number, setValue: T) => {
  const mapA = new Map<number, Map<number, Set<T>>>();
  const mapB = new Map<number, Set<T>>();
  const set = new Set<T>();
  set.add(setValue);
  mapB.set(mapBKey, set);
  mapA.set(mapAKey, mapB);
  return mapA;
};

describe('Map utils', () => {
  it('should pass', () => {
    expect(true).toBeTruthy();
  });
  it('should merge two nested maps with sets deeply, with sets being combined', () => {
    const nestedMap = createNestedMap(1, 1, 1);
    const nestedMap2 = createNestedMap(1, 1, 2);
    const merged = deepMergeMapsInPlace(nestedMap, nestedMap2);
    const resultSet = Array.from(merged.get(1)!.get(1)!.values());
    expect(resultSet).toStrictEqual([1, 2]);
  });
  it('should merge two nested maps, with nested maps being combined, ', () => {
    const nestedMap = createNestedMap(1, 1, 1);
    const nestedMap2 = createNestedMap(1, 2, 2);
    const merged = deepMergeMapsInPlace(nestedMap, nestedMap2);
    const resultSet = Array.from(merged.get(1)!.keys());
    expect(resultSet).toStrictEqual([1, 2]);
  });
});
