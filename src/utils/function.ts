export function tryFnSync(cb: () => void = () => {}) {
  try {
    cb();
  } catch {
    /* empty */
  }
}
