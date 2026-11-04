import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/ai/contracts";
import { authorize, rateLimit } from "@/lib/utils/api";
import { createGeminiModel } from "@/lib/ai/gemini";
import { createLocalModel,deterministicFollowup } from "@/lib/ai/local-model";
import { runAgent } from "@/lib/ai/agent";
import { createTradeStore } from "@/lib/ai/store";
import { ConversationMemory } from "@/lib/ai/memory";
import { AgentError, friendlyError, logEvent } from "@/lib/ai/errors";
import { detectLanguage } from "@/lib/i18n";
import type { Activity } from "@/lib/ai/contracts";
import { stateSecret, sealState, restoreState } from "@/lib/ai/state-token";
import { geminiEnabled } from "@/lib/ai/configuration";
export const runtime = "nodejs";
export const maxDuration = 60;
const globalMemory = globalThis as typeof globalThis & {
  uzexAgentMemory?: ConversationMemory;
};
const memory = (globalMemory.uzexAgentMemory ??= new ConversationMemory());
const cookieName = "uzex-session";
function owner(req: NextRequest) {
  const value = req.cookies.get(cookieName)?.value;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : randomUUID();
}
function headers(req: NextRequest, sessionOwner: string) {
  return {
    "Cache-Control": "no-store",
    "Set-Cookie": `${cookieName}=${sessionOwner}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
async function readBody(req: Request) {
  if (Number(req.headers.get("content-length")) > 50000)
    throw new AgentError("INVALID_REQUEST", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new AgentError("INVALID_REQUEST", 400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 50000) {
        await reader.cancel();
        throw new AgentError("INVALID_REQUEST", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AgentError("INVALID_REQUEST", 400);
  }
}
export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (rateLimit(req))
    return Response.json(
      {
        error: "Too many requests. Try again in a minute.",
        code: "RATE_LIMIT",
      },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  let language: "uz" | "ru" = "uz";
  try {
    const parsed = chatRequestSchema.safeParse(await readBody(req));
    if (!parsed.success) throw new AgentError("INVALID_REQUEST", 400);
    const input = parsed.data,
      question = input.message ?? input.messages!.at(-1)!.content;
    language = detectLanguage(question, input.language);
    const id = input.conversationId ?? randomUUID(),
      sessionOwner = owner(req),
      signal = AbortSignal.any([req.signal, AbortSignal.timeout(45000)]);
    const secret = stateSecret();
    const execute = (onActivity: (e: Activity) => void) =>
      memory.run(sessionOwner, id, async (session) => {
        if (input.stateToken) {
          const restored = restoreState(
            input.stateToken,
            sessionOwner,
            id,
            input.messages ?? [],
            secret,
          );
          if (!session.messages.length) session = restored;
        }
        if (
          input.conversationId &&
          input.messages &&
          input.messages.length > 1 &&
          !session.messages.length
        )
          throw new AgentError("SESSION_EXPIRED", 409);
        const base =
          input.regenerate && session.lastTurn
            ? session.lastTurn.context
            : session.context;
        const model = deterministicFollowup(question,base)??(geminiEnabled()
          ? await createGeminiModel(signal)
          : createLocalModel(question, base, process.env.AI_MODE === "local"));
        const result = await runAgent(
          { question, language, regenerate: input.regenerate },
          session,
          model,
          createTradeStore(),
          signal,
          onActivity,
        );
        result.value.stateToken = sealState(result.session, secret);
        return result;
      });
    if (req.headers.get("accept")?.includes("application/x-ndjson")) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (v: unknown) => {
            if (!signal.aborted)
              controller.enqueue(encoder.encode(JSON.stringify(v) + "\n"));
          };
          try {
            emit({ type: "activity", stage: "thinking" });
            emit({ type: "answer", answer: await execute(emit) });
          } catch (error) {
            const e = friendlyError(
              signal.aborted ? new AgentError("TIMEOUT", 504) : error,
              language,
            );
            logEvent("ai.failed", { code: e.code });
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  error: e.error,
                  code: e.code,
                }) + "\n",
              ),
            );
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          ...headers(req, sessionOwner),
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "X-Accel-Buffering": "no",
        },
      });
    }
    return NextResponse.json(await execute(() => {}), {
      headers: headers(req, sessionOwner),
    });
  } catch (error) {
    const e = friendlyError(error, language);
    logEvent("ai.failed", { code: e.code });
    return Response.json(
      { error: e.error, code: e.code },
      { status: e.status },
    );
  }
}
export async function DELETE(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (id && !/^[0-9a-f-]{36}$/i.test(id))
    return Response.json({ error: "Invalid conversation ID" }, { status: 400 });
  memory.clear(owner(req), id ?? undefined);
  return Response.json(
    { cleared: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
