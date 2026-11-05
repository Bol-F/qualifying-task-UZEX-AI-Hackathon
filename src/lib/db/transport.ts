// Preserve caller cancellation as well as the database's own deadline.
export const databaseFetch: typeof fetch = (url, init) =>
  fetch(url, {
    ...init,
    signal: AbortSignal.any([
      ...(init?.signal ? [init.signal] : []),
      AbortSignal.timeout(15000),
    ]),
    cache: "no-store",
  });
