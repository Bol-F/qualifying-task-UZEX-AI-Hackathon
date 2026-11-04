import { AgentError } from "@/lib/ai/errors";
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
export async function boundedJson(
  req: Request,
  limit: number,
): Promise<unknown> {
  if (Number(req.headers.get("content-length")) > limit)
    throw new AgentError("INVALID_REQUEST", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new AgentError("INVALID_REQUEST", 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new AgentError("INVALID_REQUEST", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AgentError("INVALID_REQUEST", 400);
  }
}
