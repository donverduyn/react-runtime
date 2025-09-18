export const setsAreEqual = <T>(x: Set<T>, y: Set<T>) =>
  x.size === y.size && [...x].every((e) => y.has(e));
