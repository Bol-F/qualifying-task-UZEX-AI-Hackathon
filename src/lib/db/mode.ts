import { AgentError } from "@/lib/ai/errors";
export function parseDataMode(value: string | undefined): "demo" | "live" {
  if (!value || value === "demo") return "demo";
  if (value === "live") return "live";
  throw new AgentError("CONFIGURATION");
}
