import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { filterDemo } from "../src/lib/db/filters";
import { filtersSchema } from "../src/lib/validations/trades";
import { demoTrades } from "../src/lib/db/demo";
import { buildTradeQuery, literalSearch } from "../src/lib/db/query-builder";
import { databaseFetch } from "../src/lib/db/transport";
import { parseDataMode } from "../src/lib/db/mode";
import { summarize } from "../src/lib/analytics/calculations";
import { dashboardPoints } from "../src/lib/analytics/chart-data";
import { sourceLink } from "../src/lib/analytics/source-links";
import {
  localToolPlan,
  createLocalModel,
  deterministicFollowup,
} from "../src/lib/ai/local-model";
import { executeTool, type TradeStore } from "../src/lib/ai/tool-runner";
import { runAgent } from "../src/lib/ai/agent";
import { interpretDates } from "../src/lib/ai/dates";
import { GET as health } from "../src/app/api/health/route";
const store: TradeStore = {
  mode: "demo",
  read: async (f) => filterDemo(demoTrades, filtersSchema.parse(f)),
  coverage: async () => ({
    from: "2026-10-01",
    to: "2026-10-30",
    total: 184,
    latestImport: "2026-10-31T00:00:00Z",
  }),
};
const empty = () => ({ filters: {}, referencedIds: [] });
const signal = () => AbortSignal.timeout(10000);

test("decimal filter boundaries and ordering retain differences beyond IEEE-754 precision", () => {
  const rows = [
    { ...demoTrades[0], id: "a", price: "999999999999999998.999999" },
    { ...demoTrades[0], id: "b", price: "999999999999999999.000001" },
  ];
  assert.deepEqual(
    filterDemo(rows, filtersSchema.parse({ sort: "price", order: "desc" })).map(
      (t) => t.id,
    ),
    ["b", "a"],
  );
  assert.deepEqual(
    filterDemo(
      rows,
      filtersSchema.parse({
        currency: "UZS",
        priceUnit: rows[0].price_unit,
        minPrice: "999999999999999999.000000",
      }),
    ).map((t) => t.id),
    ["b"],
  );
  assert.equal(
    filtersSchema.safeParse({
      currency: "UZS",
      priceUnit: "t",
      minPrice: "10",
      maxPrice: "2",
    }).success,
    false,
  );
});
test("price and quantity filters require explicit compatible definitions", () => {
  for (const input of [
    { minPrice: 2, currency: "USD" },
    { minQuantity: 1 },
    { minQuantity: 10, maxQuantity: 1, unit: "t" },
    { currency: "usd" },
    { search: "*" },
    { search: "urea\nDROP" },
  ])
    assert.equal(filtersSchema.safeParse(input).success, false);
  const rows = [
    { ...demoTrades[0], price: "10", price_unit: "t" },
    { ...demoTrades[1], price: "10", price_unit: "kg" },
  ];
  assert.equal(
    filterDemo(
      rows,
      filtersSchema.parse({ currency: "UZS", priceUnit: "t", minPrice: "1" }),
    ).length,
    1,
  );
});
test("real Supabase query builder quotes untrusted PostgREST values and keeps financial columns as text", async () => {
  const hostile = 'urea%),id.neq.0,price.gte.0,"\\_';
  let captured: URL | undefined;
  const db = createClient("https://test.invalid", "test-key", {
    auth: { persistSession: false },
    global: {
      fetch: async (url) => {
        captured = new URL(String(url));
        return Response.json([], { headers: { "content-range": "*/0" } });
      },
    },
  });
  const response = await buildTradeQuery(
    db,
    filtersSchema.parse({
      search: hostile,
      productNames: ["Urea (carbamide)", "Portland cement"],
      currency: "USD",
      priceUnit: "t",
      minPrice: "999999999999999999.000001",
      page: 2,
    }),
  ).range(12, 23);
  assert.equal(response.error, null);
  const params = captured!.searchParams;
  assert.equal(params.get("minPrice"), null);
  assert.equal(params.get("price"), "gte.999999999999999999.000001");
  assert.equal(params.get("price_unit"), "eq.t");
  assert.match(params.get("select")!, /price::text,quantity::text/);
  assert.equal(params.get("order"), "trade_date.desc,id.asc");
  assert.equal(params.get("offset"), "12");
  assert.equal(params.get("limit"), "12");
  const matches = [
    ...params
      .get("or")!
      .matchAll(
        /(?:normalized_product_name|contract_number|external_id|id)\.ilike\.("(?:\\.|[^"\\])*")/g,
      ),
  ];
  assert.equal(matches.length, 4);
  for (const value of matches) assert.equal(value[1], literalSearch(hostile));
});
test("database timeout wrapper preserves caller abort and disables stale fetch caching", async (t) => {
  const original = globalThis.fetch;
  let init: RequestInit | undefined;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (_url, options) => {
    init = options;
    return Response.json([]);
  };
  const controller = new AbortController();
  await databaseFetch("https://test.invalid", { signal: controller.signal });
  assert.equal(init?.cache, "no-store");
  controller.abort();
  assert.equal(init?.signal?.aborted, true);
});
test("invalid data configuration fails closed and health is degraded without exposing secrets", async (t) => {
  const previous = process.env.DATA_MODE;
  t.after(() => {
    if (previous === undefined) delete process.env.DATA_MODE;
    else process.env.DATA_MODE = previous;
  });
  assert.equal(parseDataMode(undefined), "demo");
  assert.equal(parseDataMode("live"), "live");
  assert.throws(() => parseDataMode("lve"));
  process.env.DATA_MODE = "lve";
  const response = health();
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.dataMode, "unavailable");
  assert.equal(
    JSON.stringify(body).includes(
      process.env.GEMINI_API_KEY || "no-secret-value",
    ),
    false,
  );
});
test("dashboard never zero-fills a missing currency/unit and retains real zero values", () => {
  const stats = summarize([
    {
      ...demoTrades[0],
      trade_date: "2026-10-01",
      currency: "USD",
      quantity: "0",
    },
    { ...demoTrades[1], trade_date: "2026-10-02", currency: "UZS" },
  ]);
  assert.deepEqual(
    dashboardPoints(stats, "value", "USD").map((p) => p.value),
    [0, null],
  );
  assert.deepEqual(
    dashboardPoints(stats, "count", "transactions").map((p) => p.value),
    [1, 1],
  );
});
test("source links preserve multiple commodity, date and contract constraints", () => {
  const selection = {
    from: "2026-10-24",
    to: "2026-10-30",
    products: ["Urea (carbamide)", "Portland cement"],
    contractType: "Forward",
  };
  const params = new URL(sourceLink(selection), "https://test.invalid")
    .searchParams;
  assert.deepEqual(params.getAll("product"), selection.products);
  assert.equal(params.get("contractType"), "Forward");
  const subset = filterDemo(
    demoTrades,
    filtersSchema.parse({
      from: params.get("from"),
      to: params.get("to"),
      contractType: params.get("contractType"),
      productNames: params.getAll("product"),
    }),
  );
  assert.ok(subset.length);
  assert.ok(
    subset.every(
      (t) =>
        selection.products.includes(t.product_name) &&
        t.contract_type === "Forward",
    ),
  );
});
test("last two available days are discovered from matching stored records, with missing baselines unavailable", async () => {
  const plan = localToolPlan(
    "Сравни активность за два доступных торговых дня.",
    { filters: { search: "urea" }, referencedIds: [] },
  );
  assert.equal(plan.name, "compare_trading_periods");
  const result = await executeTool(
    "compare_trading_periods",
    plan.args,
    empty(),
    store,
    "ru",
    signal(),
  );
  assert.deepEqual(
    result.evidence.points.map((p) => p.value),
    ["3", "3"],
  );
  assert.equal(result.evidence.periods?.[1].from, "2026-10-24");
  const missing = await executeTool(
    "compare_trading_periods",
    {
      metric: "count",
      lastTwoAvailableDays: true,
      filters: { search: "gold" },
    },
    empty(),
    store,
    "uz",
    signal(),
  );
  assert.deepEqual(
    missing.evidence.points.map((p) => p.value),
    [null, null],
  );
  const one = await executeTool(
    "compare_trading_periods",
    {
      metric: "count",
      lastTwoAvailableDays: true,
      filters: { search: "urea", to: "2026-10-01" },
    },
    empty(),
    store,
    "uz",
    signal(),
  );
  assert.equal(one.evidence.points[1].value, null);
});
test("overlapping comparison sources never duplicate IDs and samples represent both periods", async () => {
  const result = await executeTool(
    "compare_trading_periods",
    {
      metric: "count",
      periodA: { from: "2026-10-24", to: "2026-10-28" },
      periodB: { from: "2026-10-28", to: "2026-10-30" },
    },
    empty(),
    store,
    "ru",
    signal(),
  );
  assert.equal(
    new Set(result.evidence.rows.map((r) => r.id)).size,
    result.evidence.rows.length,
  );
  assert.ok(result.evidence.rows.some((r) => r.trade_date === "2026-10-30"));
  assert.equal(
    new Set(result.evidence.recordIds).size,
    result.evidence.recordIds.length,
  );
});
test("language-only Uzbek follow-up repeats validated constraints without a provider call", async () => {
  const context = {
    filters: { search: "urea", from: "2026-10-28", to: "2026-10-28" },
    referencedIds: [],
  };
  const first = await runAgent(
    { question: "Покажи карбамид за 2026-10-28.", language: "ru" },
    {
      id: randomUUID(),
      owner: randomUUID(),
      context,
      messages: [],
      updatedAt: Date.now(),
    },
    createLocalModel("Покажи карбамид за 2026-10-28.", context),
    store,
    signal(),
  );
  const q = "Endi natijani o'zbek tilida tushuntir.";
  const model = deterministicFollowup(q, first.session.context);
  assert.ok(model);
  const result = await runAgent(
    { question: q, language: "ru" },
    first.session,
    model,
    store,
    signal(),
  );
  assert.equal(result.value.language, "uz");
  assert.deepEqual(result.value.context.filters, context.filters);
  assert.equal(result.value.evidence[0].matchedRecords, 3);
});
test("knowledge distinguishes a transaction from an exchange and malformed dates cannot broaden a query", () => {
  const plan = localToolPlan("Что такое биржевая сделка?", empty());
  assert.equal(plan.args.term, "transaction");
  assert.throws(() => localToolPlan("Покажи карбамид за 2026-02-30.", empty()));
  assert.deepEqual(
    interpretDates(
      "4-noyabr kuni karbamid bo'yicha nechta bitim tuzilgan?",
      "2026-11-04",
    ),
    ["2026-11-04"],
  );
});
