export function tryFnSync<R>(cb: () => R): R | Error {
  try {
    return cb();
  } catch (err) {
    return new Error(String(err));
  }
}
