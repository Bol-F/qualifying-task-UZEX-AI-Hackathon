import { z } from "zod";
import { AgentError } from "./errors";
export const geminiEnabled = () =>
  process.env.AI_MODE !== "local" && !!process.env.GEMINI_API_KEY;
const schema = z.object({
  apiKey: z.string().min(10),
  model: z.string().regex(/^[a-zA-Z0-9._-]{1,100}$/),
});
export function geminiConfiguration(env: Record<string, string | undefined>) {
  const parsed = schema.safeParse({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  });
  if (!parsed.success) throw new AgentError("CONFIGURATION");
  return parsed.data;
}
