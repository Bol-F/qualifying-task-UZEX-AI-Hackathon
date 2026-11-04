import {
  createHmac,
  createHash,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
import { scopeSchema } from "./contracts";
import type { Session, Turn } from "./memory";
import { boundHistory } from "./memory";
import { AgentError } from "./errors";
import { toolNames } from "./registry";
const contextSchema = z.object({
  filters: scopeSchema,
  referencedIds: z.array(z.string().max(150)).max(20),
  lastTool: z
    .enum(
      toolNames as [
        (typeof toolNames)[number],
        ...(typeof toolNames)[number][],
      ],
    )
    .optional(),
  lastArgs: z.record(z.string(), z.unknown()).optional(),
});
const checkpointSchema = z.object({
  id: z.uuid(),
  subject: z.string(),
  expires: z.number(),
  context: contextSchema,
  lastTurn: z
    .object({ context: contextSchema, question: z.string().max(6000) })
    .optional(),
});
const processState = globalThis as typeof globalThis & {
  uzexStateSecret?: string;
};
export function stateSecret() {
  const secret = process.env.AGENT_STATE_SECRET;
  if (secret) {
    if (secret.length < 32) throw new AgentError("CONFIGURATION");
    return secret;
  }
  if (process.env.VERCEL) throw new AgentError("CONFIGURATION");
  return (processState.uzexStateSecret ??= randomBytes(32).toString("hex"));
}
const subject = (owner: string) =>
  createHash("sha256").update(owner).digest("hex");
export function sealState(session: Session, secret: string) {
  const data = {
    id: session.id,
    subject: subject(session.owner),
    expires: Date.now() + 3600000,
    context: session.context,
    lastTurn: session.lastTurn
      ? {
          context: session.lastTurn.context,
          question: session.lastTurn.question,
        }
      : undefined,
  };
  const json = JSON.stringify(data);
  if (Buffer.byteLength(json) > 20000)
    throw new AgentError("INVALID_REQUEST", 413);
  const payload = Buffer.from(json).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret).update(payload).digest("base64url")
  );
}
export function restoreState(
  token: string,
  owner: string,
  id: string,
  messages: Turn[],
  secret: string,
): Session {
  try {
    if (token.length > 30000) throw new Error();
    const [payload, signature, ...extra] = token.split(".");
    if (extra.length || !payload || !signature) throw new Error();
    const expected = createHmac("sha256", secret).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      throw new Error();
    const parsed = checkpointSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (
      parsed.id !== id ||
      parsed.subject !== subject(owner) ||
      parsed.expires < Date.now()
    )
      throw new Error();
    const history = boundHistory(messages.slice(0, -1));
    return {
      id,
      owner,
      context: parsed.context,
      messages: history,
      updatedAt: Date.now(),
      lastTurn: parsed.lastTurn
        ? { ...parsed.lastTurn, messages: history }
        : undefined,
    };
  } catch {
    throw new AgentError("SESSION_EXPIRED", 409);
  }
}
