import { AgentError, logEvent } from "./errors";
export function modelError(error: unknown) {
  const e = error as { status?: number; name?: string };
  if (e?.name === "AbortError" || e?.name === "TimeoutError")
    return new AgentError("TIMEOUT", 504);
  if (e?.status === 429) return new AgentError("QUOTA", 429);
  if ([400, 401, 403, 404].includes(e?.status ?? 0))
    return new AgentError("CONFIGURATION");
  return new AgentError("MODEL_UNAVAILABLE");
}
export async function withRetry<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
  wait: (ms: number, signal: AbortSignal) => Promise<void> = abortableDelay,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    try {
      return await operation();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const transient =
        status === 429 || [500, 502, 503, 504].includes(status ?? 0);
      if (!transient || attempt === 2) throw modelError(error);
      logEvent("ai.retry", {
        attempt: attempt + 1,
        code: status === 429 ? "QUOTA" : "TRANSIENT",
      });
      await wait(250 * 2 ** attempt, signal);
    }
  }
  throw new AgentError("MODEL_UNAVAILABLE");
}
async function abortableDelay(ms: number, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(new AgentError("TIMEOUT", 504));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
