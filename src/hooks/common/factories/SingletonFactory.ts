export const createSingletonHook = <T>(create: () => T) => {
  let reference: T | undefined;
  return () => reference ?? (reference = create());
};
