import "server-only";
import { createClient } from "@supabase/supabase-js";
import { databaseFetch } from "./transport";
import { parseDataMode } from "./mode";
export function dataMode(): "demo" | "live" {
  return parseDataMode(process.env.DATA_MODE);
}
export function database() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: databaseFetch,
    },
  });
}
