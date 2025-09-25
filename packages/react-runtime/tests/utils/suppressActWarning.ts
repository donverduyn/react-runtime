export async function suppressActWarning<T>(fn: () => Promise<T>): Promise<T> {
  const originalError = console.error;

  console.error = (...args: Parameters<typeof console.error>) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes(
        'The current testing environment is not configured to support act(...)'
      )
    ) {
      return;
    }
    originalError(...args);
  };

  try {
    return await fn();
  } finally {
    console.error = originalError;
  }
}
