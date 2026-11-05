import { z } from "zod";
import type { FunctionDeclaration } from "@google/genai";
import { scopeSchema, chartTypeSchema } from "./contracts";
import { dateSchema } from "@/lib/validations/trades";
const base = {
  filters: scopeSchema.optional(),
  resetFilters: z.boolean().optional(),
  visualization: chartTypeSchema.optional(),
};
const metric = z.enum(["count", "value", "quantity"]);
const period = z
  .strictObject({ from: dateSchema, to: dateSchema })
  .refine((v) => v.from <= v.to, "Reversed period");
export const toolSchemas = {
  search_trades: z.strictObject({
    ...base,
    limit: z.number().int().min(1).max(10).default(5),
    sort: z
      .enum(["trade_date", "price", "quantity", "value"])
      .default("trade_date"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }),
  get_trade_details: z.strictObject({ id: z.string().min(1).max(150) }),
  get_market_overview: z.strictObject(base),
  get_top_commodities: z.strictObject({
    ...base,
    metric,
    limit: z.number().int().min(1).max(10).default(5),
  }),
  compare_trading_periods: z
    .strictObject({
      ...base,
      metric,
      periodA: period.optional(),
      periodB: period.optional(),
      previousAvailableDay: z.boolean().optional(),
      lastTwoAvailableDays: z.boolean().optional(),
      commodities: z.array(z.string().min(1).max(120)).length(2).optional(),
    })
    .refine(
      (v) =>
        !!v.lastTwoAvailableDays ||
        !!v.commodities ||
        (!!v.periodA && (!!v.periodB || !!v.previousAvailableDay)),
      "Provide two commodities, the last two available days, or a current period and comparison",
    )
    .refine(
      (v) =>
        [
          !!v.commodities,
          !!v.previousAvailableDay,
          !!v.lastTwoAvailableDays,
        ].filter(Boolean).length <= 1,
      "Choose one comparison mode",
    ),
  get_transaction_trends: z.strictObject({
    ...base,
    metric,
    lastTradingDays: z.number().int().min(1).max(90).optional(),
  }),
  explain_exchange_term: z.strictObject({
    term: z.enum([
      "exchange",
      "transaction",
      "auction",
      "status",
      "price_basis",
      "spot",
      "forward",
      "quantity",
    ]),
  }),
};
export type ToolName = keyof typeof toolSchemas;
export const toolNames = Object.keys(toolSchemas) as ToolName[];
const descriptions: Record<ToolName, string> = {
  search_trades:
    "Read matching stored transactions. Merge filters with active context unless resetFilters=true. Limit 10. Largest must specify sort; value requires currency, quantity requires comparable units.",
  get_trade_details:
    "Look up one exact internal stored record ID; contract numbers are not unique.",
  get_market_overview:
    "Calculate count, value per currency, quantity per unit and coverage.",
  get_top_commodities:
    "Rank commodities by an explicit metric. Value requires currency; quantity requires unit.",
  compare_trading_periods:
    "Compare two explicit inclusive periods, two commodity aliases, the latest two observed dates via lastTwoAvailableDays=true, or periodA against the previous available trading day via previousAvailableDay=true. Missing observations are unavailable, never zero. Value needs currency; quantity needs unit.",
  get_transaction_trends:
    "Daily deterministic aggregates. Use lastTradingDays for the last N available dates, not calendar days. Request a chart with visualization.",
  explain_exchange_term:
    "Retrieve an approved bilingual knowledge entry, official source links where verified, and limitations; never infer official rules.",
};
export const toolDeclarations: FunctionDeclaration[] = toolNames.map((name) => {
  const parametersJsonSchema = z.toJSONSchema(toolSchemas[name], {
    unrepresentable: "any",
  });
  delete parametersJsonSchema.$schema;
  return {
    name,
    description: descriptions[name],
    parametersJsonSchema,
  };
});
