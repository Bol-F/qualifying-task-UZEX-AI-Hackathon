import { dataMode } from "@/lib/db/client";
import { geminiEnabled } from "@/lib/ai/configuration";
export function GET() {
  const configurationIssues: string[] = [];
  if (process.env.AI_MODE && !["auto", "local"].includes(process.env.AI_MODE))
    configurationIssues.push("AI_MODE must be auto or local");
  if (
    process.env.DATA_MODE &&
    !["demo", "live"].includes(process.env.DATA_MODE)
  )
    configurationIssues.push("DATA_MODE must be demo or live");
  if (
    dataMode() === "live" &&
    !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
    configurationIssues.push("Live database credentials are missing");
  if (process.env.VERCEL && (process.env.AGENT_STATE_SECRET?.length ?? 0) < 32)
    configurationIssues.push(
      "Vercel requires AGENT_STATE_SECRET with at least 32 characters",
    );
  return Response.json(
    {
      status: configurationIssues.length ? "degraded" : "ok",
      configurationIssues,
      sessionCheckpointConfigured:
        (process.env.AGENT_STATE_SECRET?.length ?? 0) >= 32,
      dataMode: dataMode(),
      aiConfigured: geminiEnabled(),
      aiMode: process.env.AI_MODE === "local" ? "local" : "auto",
      databaseConfigured: !!(
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    },
    {
      status: configurationIssues.length ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
