import { AgentError } from "@/lib/ai/errors";
export function parseDataMode(value: string | undefined): "demo" | "live" | "local" {
  if (!value || value === "demo") return "demo";
  if (value === "live") return "live";
  if (value === "local") return "local";
  throw new AgentError("CONFIGURATION");
}
