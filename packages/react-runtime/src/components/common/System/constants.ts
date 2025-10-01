export const RUNTIME_STUBS = [
  // undefined,
  // true,
  // false,
  // {},
  // { a: 1 },
  // new Proxy({}, { get: () => 1 }),
  // new Proxy({}, { get: () => 0 }),
  // new Proxy({}, { get: () => undefined }),
  // new Proxy({}, { get: () => false }),
  // new Proxy({}, { get: () => true }),
  new Proxy({}, { get: () => ({}) }),
  // new Proxy({}, { get: () => [] }),
  // new Proxy({}, { get: () => null }),

  // TODO: consider tracking object property access, so we can do targeted stubbing. however for string and numbers this would not be feasible as they have large ranges
  // Arrays and other non-object types are not used, as property access is required to trigger the proxy
  // string properties cannot be matched, so without knowing property access, we risk missing modules, but we account for this by running a third strategy that collects everything.
] as never[];
