export const createSingletonHook = <T>(create: () => T): (() => T) => {
  let reference: T | undefined;
  return () => reference ?? (reference = create());
};
