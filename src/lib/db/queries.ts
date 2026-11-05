import "server-only";
import { AgentError } from "@/lib/ai/errors";
import { database, dataMode } from "./client";
import { demoTrades } from "./demo";
import {
  filtersSchema,
  tradeSchema,
  type Filters,
  type Trade,
} from "@/lib/validations/trades";
import { filterDemo } from "./filters";
import { buildTradeQuery } from "./query-builder";
export { filterDemo } from "./filters";
export async function datasetCoverage(signal?: AbortSignal) {
  if (dataMode() === "demo") {
    return {
      from: demoTrades.reduce<string | null>(
        (v, t) => (!v || t.trade_date < v ? t.trade_date : v),
        null,
      ),
      to: demoTrades.reduce<string | null>(
        (v, t) => (!v || t.trade_date > v ? t.trade_date : v),
        null,
      ),
      total: demoTrades.length,
      latestImport: demoTrades.reduce<string | null>(
        (v, t) => (!v || t.imported_at > v ? t.imported_at : v),
        null,
      ),
    };
  }
  const db = database();
  const queries = [
    db
      .from("trades")
      .select("trade_date", { count: "exact" })
      .order("trade_date")
      .limit(1),
    db
      .from("trades")
      .select("trade_date")
      .order("trade_date", { ascending: false })
      .limit(1),
    db
      .from("trades")
      .select("imported_at")
      .order("imported_at", { ascending: false })
      .limit(1),
  ] as const;
  const [first, last, updated] = await Promise.all([
    signal ? queries[0].abortSignal(signal) : queries[0],
    signal ? queries[1].abortSignal(signal) : queries[1],
    signal ? queries[2].abortSignal(signal) : queries[2],
  ]);
  if (first.error || last.error || updated.error)
    throw new Error("Coverage query failed");
  return {
    from: (first.data?.[0]?.trade_date as string) ?? null,
    to: (last.data?.[0]?.trade_date as string) ?? null,
    total: first.count ?? 0,
    latestImport: (updated.data?.[0]?.imported_at as string) ?? null,
  };
}
function query(f: Filters) {
  return buildTradeQuery(database(), f);
}
export async function listTrades(input: Partial<Filters> = {}) {
  const f = filtersSchema.parse(input),
    mode = dataMode();
  if (mode === "demo") {
    const all = filterDemo(demoTrades, f);
    return {
      rows: all.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
      total: all.length,
      mode,
    };
  }
  const { data, error, count } = await query(f).range(
    (f.page - 1) * f.pageSize,
    f.page * f.pageSize - 1,
  );
  if (error) throw new Error("Database query failed");
  return {
    rows: (data ?? []).map((v) => tradeSchema.parse(v)),
    total: count ?? 0,
    mode,
  };
}
export async function allTrades(
  input: Partial<Filters> = {},
  options: { limit?: number; signal?: AbortSignal } = {},
) {
  const f = filtersSchema.parse(input);
  const limit = options.limit ?? 100000;
  if (dataMode() === "demo") {
    const rows = filterDemo(demoTrades, f);
    if (rows.length > limit) throw new AgentError("DATA_LIMIT", 422);
    return rows;
  }
  const rows: Trade[] = [];
  for (let offset = 0; ; offset += 1000) {
    options.signal?.throwIfAborted();
    const q = query(f).range(offset, Math.min(offset + 999, limit));
    const { data, error, count } = await (options.signal
      ? q.abortSignal(options.signal)
      : q);
    if (error) throw new Error("Database query failed");
    if ((count ?? 0) > limit) throw new AgentError("DATA_LIMIT", 422);
    rows.push(...(data ?? []).map((v) => tradeSchema.parse(v)));
    if (rows.length > limit)
      throw new Error(
        "Dataset exceeds interactive limit; narrow the date range",
      );
    if (!data?.length || rows.length === (count ?? 0)) break;
  }
  return rows;
}
