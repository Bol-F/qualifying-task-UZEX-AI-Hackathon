import "server-only";
import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { AgentError } from "@/lib/ai/errors";
export function failure(error: unknown) {
  if (error instanceof AgentError && error.code === "DATA_LIMIT")
    return NextResponse.json(
      {
        error:
          "This selection is too large for interactive analysis. Narrow the date range.",
        code: error.code,
      },
      { status: 422 },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "Invalid request", details: error.issues.map((i) => i.message) },
      { status: 400 },
    );
  return NextResponse.json(
    { error: "Service unavailable. Check server configuration or try again." },
    { status: 503 },
  );
}
export function authorize(req: Request) {
  const key = process.env.APP_API_KEY;
  return key && req.headers.get("x-api-key") !== key
    ? NextResponse.json({ error: "Access key required" }, { status: 401 })
    : null;
}
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(req: Request) {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  let b = buckets.get(ip);
  if (!b) {
    if (buckets.size > 10000) return true;
    b = { count: 0, reset: now + 60000 };
    buckets.set(ip, b);
  }
  return ++b.count > 15;
}
