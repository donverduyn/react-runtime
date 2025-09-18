export function tryFnSync<R>(cb: () => R, errorCb?: () => R): R | undefined {
  try {
    return cb();
  } catch {
    return errorCb ? errorCb() : undefined;
  }
}
