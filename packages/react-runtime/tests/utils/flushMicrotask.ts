export const flushMicrotasks = () => new Promise<void>(queueMicrotask);
