import { authorize, rateLimit } from "@/lib/utils/api";
import { workspaceSchema } from "@/lib/analytics/workspace";
import { loadWorkspace } from "@/lib/analytics/service";
import { createReportModel } from "@/lib/ai/client";
import { explainFacts } from "@/lib/ai/report-explanations";
import { friendlyError } from "@/lib/ai/errors";
import { boundedJson, sameOrigin } from "@/lib/utils/request";
import { geminiEnabled } from "@/lib/ai/configuration";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  if (rateLimit(req))
    return Response.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429 },
    );
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const json = await boundedJson(req, 8000);
    const parsed = workspaceSchema.safeParse(json);
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues.map((i) => i.message).join(". ") },
        { status: 400 },
      );
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(30000)]),
      snapshot = await loadWorkspace(parsed.data, signal);
    const calculated =
      new URL(req.url).searchParams.get("commentary") === "calculated";
    const model =
      geminiEnabled() && !calculated && snapshot.facts.length > 0
        ? await createReportModel(signal)
        : undefined;
    const commentary = await explainFacts(snapshot.facts, model);
    if (!snapshot.facts.length)
      commentary.warning =
        "No calculated observations are available for this selection. No AI commentary was requested.";
    if (process.env.AI_MODE === "local")
      commentary.warning =
        "Local tool mode is active. This report contains verified calculations and deterministic explanations; Gemini commentary was not requested.";
    if (calculated)
      commentary.warning =
        "You selected a calculated report. Gemini commentary was not requested.";
    return Response.json(
      { snapshot, commentary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const safe = friendlyError(error, "uz");
    return Response.json(
      { error: safe.error, code: safe.code },
      { status: safe.status },
    );
  }
}
