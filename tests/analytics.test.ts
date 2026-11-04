import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../src/lib/analytics/calculations";
import { demoTrades } from "../src/lib/db/demo";
import { filtersSchema, tradeSchema } from "../src/lib/validations/trades";
import { detectLanguage } from "../src/lib/i18n";
import { planSchema } from "../src/lib/ai/tools";
import { normalizeProduct } from "../src/lib/utils/product";
test("import normalization connects Russian and Uzbek product names to AI searches", () => {
  assert.match(normalizeProduct("Карбамид марки Б"), /urea/);
  assert.match(normalizeProduct("Sement M400"), /cement/);
});
test("large financial products retain all significant digits", () => {
  const stats = summarize([
    {
      ...demoTrades[0],
      price: "999999999999999999",
      quantity: "999999999999999999",
    },
  ]);
  assert.equal(stats.values.UZS, "999999999999999998000000000000000001");
});
test("financial values remain exact and currencies and units stay separate", () => {
  const base = demoTrades[0];
  const stats = summarize([
    {
      ...base,
      price: "0.1",
      quantity: "3",
      currency: "UZS",
      unit: "t",
      price_unit: "t",
    },
    {
      ...base,
      price: "0.2",
      quantity: "2",
      currency: "USD",
      unit: "kg",
      price_unit: "kg",
    },
    { ...base, quantity: "10", unit: "t", price_unit: "kg" },
    { ...base, quantity: "1", currency: null },
  ]);
  assert.deepEqual(stats.values, { UZS: "0.3", USD: "0.4" });
  assert.deepEqual(stats.quantities, { t: "14", kg: "2" });
  assert.equal(stats.excluded, 2);
});
test("empty data never creates made up metrics", () => {
  const s = summarize([]);
  assert.equal(s.count, 0);
  assert.equal(s.latest, null);
  assert.deepEqual(s.values, {});
});
test("all synthetic records validate and summaries match record counts", () => {
  demoTrades.forEach((t) => tradeSchema.parse(t));
  const s = summarize(demoTrades);
  assert.equal(s.count, 184);
  assert.equal(
    s.daily.reduce((n, d) => n + d.count, 0),
    184,
  );
  assert.equal(
    s.products.reduce((n, d) => n + d.count, 0),
    184,
  );
});
test("filters reject impossible dates, reversed ranges, invalid sorting and currencyless prices", () => {
  for (const value of [
    { from: "2026-02-30" },
    { from: "2026-11-04", to: "2026-10-01" },
    { page: 0 },
    { minPrice: 2 },
    { sort: "drop table trades" },
    { minPrice: 10, maxPrice: 1, currency: "USD" },
  ])
    assert.equal(filtersSchema.safeParse(value).success, false);
});
test("AI calls require comparison dates and allowlisted intents", () => {
  assert.equal(planSchema.safeParse({ intent: "compare" }).success, false);
  assert.equal(
    planSchema.safeParse({ intent: "sql", query: "DROP TABLE trades" }).success,
    false,
  );
});
test("language detection handles Uzbek and Russian", () => {
  assert.equal(detectLanguage("Bugun nechta bitim tuzilgan?"), "uz");
  assert.equal(detectLanguage("Покажи сделки по карбамиду."), "ru");
});
