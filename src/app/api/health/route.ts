import { existsSync } from "node:fs";
import { resolve } from "node:path";
export function GET() {
  const configurationIssues: string[] = [];
  if (process.env.AI_MODE && !["auto", "local"].includes(process.env.AI_MODE))
    configurationIssues.push("AI_MODE must be auto or local");
  if (
    process.env.DATA_MODE &&
    !["demo", "live", "local"].includes(process.env.DATA_MODE)
  )
    configurationIssues.push("DATA_MODE must be demo, local or live");
  if (
    process.env.DATA_MODE === "local" &&
    !existsSync(
      /* turbopackIgnore: true */ resolve(
        /* turbopackIgnore: true */ process.env.LOCAL_DATA_PATH ||
          "data/registry.sqlite",
      ),
    )
  )
    configurationIssues.push(
      "Local registry is missing. Run npm run import:registry first.",
    );
  if (
    process.env.DATA_MODE === "live" &&
    !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
    configurationIssues.push("Live database credentials are missing");
  if (process.env.VERCEL && (process.env.AGENT_STATE_SECRET?.length ?? 0) < 32)
    configurationIssues.push(
      "Vercel requires AGENT_STATE_SECRET with at least 32 characters",
    );
  if (
    process.env.AGENT_STATE_SECRET &&
    process.env.AGENT_STATE_SECRET.length < 32 &&
    !process.env.VERCEL
  )
    configurationIssues.push(
      "AGENT_STATE_SECRET must contain at least 32 characters",
    );
  return Response.json(
    {
      status: configurationIssues.length ? "degraded" : "ok",
      configurationIssues,
      sessionCheckpointConfigured:
        (process.env.AGENT_STATE_SECRET?.length ?? 0) >= 32,
      dataMode:
        !process.env.DATA_MODE || process.env.DATA_MODE === "demo"
          ? "demo"
          : ["live", "local"].includes(process.env.DATA_MODE)
            ? process.env.DATA_MODE
            : "unavailable",
      aiConfigured:
        (!process.env.AI_MODE || process.env.AI_MODE === "auto") &&
        !!process.env.GEMINI_API_KEY,
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
