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
