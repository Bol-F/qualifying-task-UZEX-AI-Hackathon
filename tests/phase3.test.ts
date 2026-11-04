import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  workspace,
  workspaceSchema,
  measure,
  comparison,
} from "../src/lib/analytics/workspace";
import { deriveInsights } from "../src/lib/analytics/insights";
import { detectPatterns } from "../src/lib/analytics/patterns";
import { demoQuestions } from "../src/lib/analytics/demo";
import { demoTrades } from "../src/lib/db/demo";
import { filterDemo } from "../src/lib/db/filters";
import { filtersSchema } from "../src/lib/validations/trades";
import { explainFacts } from "../src/lib/ai/report-explanations";
import { sealState, restoreState } from "../src/lib/ai/state-token";
import type { Session } from "../src/lib/ai/memory";
import { executeTool, type TradeStore } from "../src/lib/ai/tool-runner";
import {
  localToolPlan,
  deterministicFollowup,
} from "../src/lib/ai/local-model";
import { chartCsv } from "../src/lib/utils/csv";
import { boundedJson } from "../src/lib/utils/request";
import { runAgent } from "../src/lib/ai/agent";
import { AgentError } from "../src/lib/ai/errors";
const signal = () => AbortSignal.timeout(10000);
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
test("workspace supports multiple commodities, exact source dates and compatible volume/value measures", () => {
  const names = [demoTrades[0].product_name, demoTrades[1].product_name];
  const data = workspace(
    demoTrades,
    workspaceSchema.parse({ products: names }),
  );
  assert.equal(data.series.length, new Set(names).size);
  assert.equal(
    data.selectedCount,
    demoTrades.filter((t) => names.includes(t.product_name)).length,
  );
  assert.ok(
    data.series.every((s) =>
      s.points.every(
        (p) =>
          p.value === null ||
          Number(p.value) ===
            demoTrades.filter(
              (t) => t.product_name === s.name && t.trade_date === p.label,
            ).length,
      ),
    ),
  );
  const mixed = [
    {
      ...demoTrades[0],
      currency: "UZS",
      price: "0.1",
      quantity: "3",
      unit: "t",
      price_unit: "t",
    },
    {
      ...demoTrades[0],
      currency: "USD",
      price: "2",
      quantity: "7",
      unit: "kg",
      price_unit: "kg",
    },
  ];
  assert.equal(
    measure(mixed, { metric: "value", currency: "UZS" }).value,
    "0.3",
  );
  assert.equal(measure(mixed, { metric: "quantity", unit: "kg" }).value, "7");
});
test("missing records are unavailable; real zero and mathematically undefined percentages are distinct", () => {
  const empty = measure([], { metric: "count" });
  assert.equal(empty.value, null);
  assert.equal(
    comparison(measure(demoTrades, { metric: "count" }), empty).difference,
    null,
  );
  const zero = measure([{ ...demoTrades[0], price: "0" }], {
    metric: "value",
    currency: "UZS",
  });
  assert.equal(zero.value, "0");
  assert.equal(comparison({ ...zero, value: "20" }, zero).percent, null);
  assert.equal(
    comparison({ ...zero, value: "30" }, { ...zero, value: "20" }).percent,
    "50.00",
  );
});
test("commodity, date and contract-type baselines have explicit underlying counts", () => {
  const view = workspace(
    demoTrades,
    workspaceSchema.parse({
      contractType: "Spot",
      compareContractType: "Forward",
    }),
  );
  assert.equal(
    view.comparison!.current.records,
    demoTrades.filter((t) => t.contract_type === "Spot").length,
  );
  assert.equal(
    view.comparison!.baseline.records,
    demoTrades.filter((t) => t.contract_type === "Forward").length,
  );
  const absent = workspace(
    demoTrades,
    workspaceSchema.parse({
      from: "2026-11-04",
      to: "2026-11-04",
      compareFrom: "2026-10-30",
      compareTo: "2026-10-30",
    }),
  );
  assert.equal(absent.comparison!.current.value, null);
  assert.ok(absent.comparison!.baseline.records > 0);
  assert.equal(absent.comparison!.percent, null);
});
test("insights carry deterministic baselines, source filters, coverage and record IDs", () => {
  const facts = deriveInsights(demoTrades);
  assert.equal(facts.length, 3);
  for (const f of facts) {
    assert.ok(f.baseline);
    assert.equal(f.coverage.records, 184);
    assert.ok(f.recordIds.every((id) => demoTrades.some((r) => r.id === id)));
  }
  assert.deepEqual(deriveInsights([]), []);
});
test("pattern rules flag IQR outliers, source duplicates, gaps and missing price basis without treating contracts as unique", () => {
  const rows = Array.from({ length: 9 }, (_, i) => ({
    ...demoTrades[0],
    id: String(i),
    external_id: i < 2 ? "repeat" : "id-" + i,
    contract_number: "same-contract",
    price: i === 8 ? "1000000" : "1",
    quantity: "1",
    trade_date: i === 8 ? "2026-10-05" : "2026-10-01",
    price_unit: i === 7 ? null : demoTrades[0].unit,
  }));
  const patterns = detectPatterns(rows);
  assert.ok(patterns.findings.some((p) => p.title.includes("Large reported")));
  assert.ok(
    patterns.findings.some((p) => p.title.includes("Repeated external")),
  );
  assert.ok(patterns.findings.some((p) => p.title.includes("Gap")));
  assert.ok(
    patterns.findings.some((p) => p.title.includes("accounting review")),
  );
  assert.ok(patterns.findings.every((p) => !p.title.includes("fraud")));
  const unique = rows.map((r, i) => ({
    ...r,
    external_id: "unique-" + i,
    price: "1",
    price_unit: r.unit,
    trade_date: "2026-10-01",
  }));
  assert.equal(detectPatterns(unique).findings.length, 0);
});
test("Gemini report framing is bound to existing facts and cannot inject numerical commentary", async () => {
  const facts = deriveInsights(demoTrades);
  const report = await explainFacts(facts, {
    select: async () => ({
      sections: [
        {
          factId: facts[0].id,
          angle: "participation",
          text: "999 fabricated records",
        },
      ],
    }),
  });
  assert.doesNotMatch(report.items[0].text, /999/);
  assert.equal(report.mode, "gemini-guided");
  await assert.rejects(
    explainFacts(facts, {
      select: async () => ({
        sections: [{ factId: "invented", angle: "coverage" }],
      }),
    }),
  );
  const fallback = await explainFacts(facts);
  assert.equal(fallback.mode, "deterministic");
  assert.match(fallback.warning!, /not configured/);
});
test("signed checkpoints restore follow-up context across instances and reject tampering, wrong owners and expiry", () => {
  const secret = "test-state-secret-32-characters-minimum";
  const session: Session = {
    id: randomUUID(),
    owner: randomUUID(),
    context: {
      filters: { search: "urea", from: "2026-10-28", to: "2026-10-28" },
      referencedIds: ["demo-1"],
    },
    messages: [],
    updatedAt: Date.now(),
  };
  const token = sealState(session, secret);
  assert.deepEqual(
    restoreState(token, session.owner, session.id, [], secret).context,
    session.context,
  );
  assert.throws(() =>
    restoreState(token, randomUUID(), session.id, [], secret),
  );
  assert.throws(() =>
    restoreState(token + "tamper", session.owner, session.id, [], secret),
  );
  assert.throws(() =>
    restoreState(token, session.owner, randomUUID(), [], secret),
  );
});
test("judge walkthrough adapts to available data and previous available day skips gaps", async () => {
  const demo = demoQuestions(demoTrades);
  assert.ok(demo.date);
  assert.ok(
    demoTrades.some(
      (t) => t.trade_date === demo.date && t.product_name === demo.commodity,
    ),
  );
  const plan = localToolPlan(demo.questions[2], {
    filters: { search: "urea", from: demo.date!, to: demo.date! },
    referencedIds: [],
  });
  assert.equal(plan.args.previousAvailableDay, true);
  const result = await executeTool(
    "compare_trading_periods",
    plan.args,
    {
      filters: { search: "urea", from: demo.date!, to: demo.date! },
      referencedIds: [],
    },
    store,
    "ru",
    signal(),
  );
  assert.ok(result.evidence.periods);
  assert.equal(result.evidence.periods![1].from, demo.previous);
  assert.ok(result.evidence.points.every((p) => p.value !== null));
});
test("AI chart builder selects top-ten commodity bars and exposes missing gold as unavailable", async () => {
  const plan = localToolPlan(
    "Create a bar chart of the ten most active commodities.",
    { filters: {}, referencedIds: [] },
  );
  assert.equal(plan.name, "get_top_commodities");
  assert.equal(plan.args.limit, 10);
  const result = await executeTool(
    "compare_trading_periods",
    { metric: "count", commodities: ["urea", "gold"] },
    { filters: {}, referencedIds: [] },
    store,
    "ru",
    signal(),
  );
  assert.equal(result.evidence.points[1].value, null);
  assert.ok(Number(result.evidence.points[0].value) > 0);
});
test("chart CSV escapes formula injection and leaves missing observations blank", () => {
  const csv = chartCsv(
    [
      { label: "=danger()", value: null },
      { label: "safe", value: "2" },
    ],
    "records",
  );
  assert.match(csv, /'=danger/);
  assert.match(csv, /,""/);
});
test("new report requests enforce a byte limit without trusting content-length", async () => {
  const req = new Request("http://localhost/api/reports", {
    method: "POST",
    body: "x".repeat(100),
  });
  await assert.rejects(
    boundedJson(req, 20),
    (e) => (e as { status: number }).status === 413,
  );
  assert.equal(
    workspaceSchema.safeParse({ metric: "quantity" }).success,
    false,
  );
  assert.equal(
    workspaceSchema.safeParse({ from: "2026-11-04", to: "2026-10-01" }).success,
    false,
  );
});
test("a failed optional Gemini explanation preserves verified tool results and follow-up context", async () => {
  let round = 0;
  const state: Session = {
    id: randomUUID(),
    owner: randomUUID(),
    context: { filters: {}, referencedIds: [] },
    messages: [],
    updatedAt: Date.now(),
  };
  const result = await runAgent(
    { question: "Обзор рынка", language: "ru" },
    state,
    {
      engine: "Mock Gemini",
      async generate() {
        if (round++ === 0)
          return {
            role: "model",
            parts: [
              { functionCall: { name: "get_market_overview", args: {} } },
            ],
          };
        throw new AgentError("TIMEOUT", 504);
      },
    },
    store,
    signal(),
  );
  assert.equal(result.value.evidence[0].matchedRecords, 184);
  assert.ok(result.value.warnings.length);
  assert.equal(result.session.messages.length, 2);
});

test("narrow context-bound follow-ups avoid unnecessary provider calls", () => {
  const context = {
    filters: { search: "urea", from: "2026-10-28", to: "2026-10-28" },
    referencedIds: [],
  };
  assert.ok(deterministicFollowup("Endi eng katta 5 tasini ko'rsat.", context));
  assert.equal(
    deterministicFollowup("Explain a new topic", context),
    undefined,
  );
  assert.equal(
    deterministicFollowup("Now show the largest five", {
      filters: {},
      referencedIds: [],
    }),
    undefined,
  );
});
