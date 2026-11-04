import "server-only";
import { createClient } from "@supabase/supabase-js";
export function dataMode(): "demo" | "live" {
  return process.env.DATA_MODE === "live" ? "live" : "demo";
}
export function database() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, init) =>
        fetch(url, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
}
