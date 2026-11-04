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
  let q = database()
    .from("trades")
    .select(
      "id,external_id,contract_number,trade_date,product_name,normalized_product_name,price::text,quantity::text,unit,price_unit,currency,contract_type,execution_status,data_source,imported_at",
      { count: "exact" },
    );
  if (f.search) {
    const safe = f.search
      .replace(/[^\p{L}\p{N}\s'-]/gu, "")
      .replace(/[%_]/g, "");
    if (safe)
      q = q.or(
        `normalized_product_name.ilike.%${safe}%,contract_number.ilike.%${safe}%,external_id.ilike.%${safe}%,id.ilike.%${safe}%`,
      );
  }
  if (f.from) q = q.gte("trade_date", f.from);
  if (f.to) q = q.lte("trade_date", f.to);
  if (f.currency) q = q.eq("currency", f.currency);
  if (f.id) q = q.eq("id", f.id);
  if (f.productName) q = q.eq("product_name", f.productName);
  if (f.contractType) q = q.eq("contract_type", f.contractType);
  if (f.contractNumber) q = q.eq("contract_number", f.contractNumber);
  if (f.unit) q = q.eq("unit", f.unit);
  if (f.status) q = q.eq("execution_status", f.status);
  if (f.minQuantity !== undefined) q = q.gte("quantity", f.minQuantity);
  if (f.maxQuantity !== undefined) q = q.lte("quantity", f.maxQuantity);
  if (f.minPrice !== undefined) q = q.gte("price", f.minPrice);
  if (f.maxPrice !== undefined) q = q.lte("price", f.maxPrice);
  return q.order(f.sort, { ascending: f.order === "asc" }).order("id");
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
