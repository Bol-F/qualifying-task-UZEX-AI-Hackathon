import Decimal from "decimal.js";
import { z } from "zod";
import type { Trade } from "@/types";
import { dateSchema } from "@/lib/validations/trades";
import { summarize } from "./calculations";
import { AgentError } from "@/lib/ai/errors";
const D = Decimal.clone({ precision: 64 });
export const workspaceSchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    products: z.array(z.string().min(1).max(300)).max(3).default([]),
    contractType: z.string().max(64).optional(),
    metric: z.enum(["count", "value", "quantity"]).default("count"),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    unit: z.string().max(30).optional(),
    compareFrom: dateSchema.optional(),
    compareTo: dateSchema.optional(),
    compareProducts: z.array(z.string().min(1).max(300)).max(3).default([]),
    compareContractType: z.string().max(64).optional(),
  })
  .refine(
    (v) => !v.from || !v.to || v.from <= v.to,
    "Invalid selected date range",
  )
  .refine(
    (v) => !v.compareFrom || !v.compareTo || v.compareFrom <= v.compareTo,
    "Invalid comparison date range",
  )
  .refine(
    (v) => v.metric !== "value" || !!v.currency,
    "Choose a currency for value analysis",
  )
  .refine(
    (v) => v.metric !== "quantity" || !!v.unit,
    "Choose a measurement unit for volume analysis",
  );
export type WorkspaceRequest = z.infer<typeof workspaceSchema>;
export type Measure = {
  value: string | null;
  records: number;
  eligible: number;
  excluded: number;
  unit: string;
};
export function measure(
  rows: Trade[],
  request: Pick<WorkspaceRequest, "metric" | "currency" | "unit">,
): Measure {
  const eligible = rows.filter((t) =>
    request.metric === "count"
      ? true
      : request.metric === "value"
        ? !!request.currency &&
          t.currency === request.currency &&
          t.price_unit === t.unit
        : !!request.unit && t.unit === request.unit,
  );
  const unit =
    request.metric === "count"
      ? "transactions"
      : request.metric === "value"
        ? (request.currency ?? "currency required")
        : (request.unit ?? "unit required");
  let value: string | null = null;
  if (eligible.length) {
    value = eligible
      .reduce(
        (sum, t) =>
          sum.plus(
            request.metric === "count"
              ? 1
              : request.metric === "value"
                ? new D(t.price).times(t.quantity)
                : t.quantity,
          ),
        new D(0),
      )
      .toFixed();
  }
  return {
    value,
    records: rows.length,
    eligible: eligible.length,
    excluded: rows.length - eligible.length,
    unit,
  };
}
export function comparison(current: Measure, baseline: Measure) {
  const comparable =
    current.unit === baseline.unit &&
    current.value !== null &&
    baseline.value !== null;
  const difference = comparable
    ? new D(current.value!).minus(baseline.value!).toFixed()
    : null;
  const percent =
    comparable && !new D(baseline.value!).isZero()
      ? new D(difference!)
          .div(new D(baseline.value!).abs())
          .times(100)
          .toFixed(2)
      : null;
  return {
    current,
    baseline,
    difference,
    percent,
    warnings: [
      ...(current.value === null || baseline.value === null
        ? [
            "At least one selection has no comparable records. Missing observations are not treated as zero.",
          ]
        : []),
      ...(comparable && percent === null
        ? ["Percentage change is undefined for a zero baseline."]
        : []),
    ],
  };
}
export function selectRows(
  rows: Trade[],
  scope: {
    from?: string;
    to?: string;
    products?: string[];
    contractType?: string;
  },
) {
  return rows.filter(
    (t) =>
      (!scope.from || t.trade_date >= scope.from) &&
      (!scope.to || t.trade_date <= scope.to) &&
      (!scope.products?.length || scope.products.includes(t.product_name)) &&
      (!scope.contractType || t.contract_type === scope.contractType),
  );
}
export function workspace(rows: Trade[], request: WorkspaceRequest) {
  const selected = selectRows(rows, request);
  const hasComparison = !!(
    request.compareFrom ||
    request.compareTo ||
    request.compareProducts.length ||
    request.compareContractType
  );
  const baseline = selectRows(rows, {
    from: request.compareFrom ?? request.from,
    to: request.compareTo ?? request.to,
    products: request.compareProducts.length
      ? request.compareProducts
      : request.products,
    contractType: request.compareContractType ?? request.contractType,
  });
  const dates = [...new Set(selected.map((t) => t.trade_date))].sort();
  if (dates.length > 366) throw new AgentError("DATA_LIMIT", 422);
  const names = request.products.length
    ? [...new Set(request.products)]
    : [...new Set(selected.map((t) => t.product_name))].slice(0, 3);
  const byProduct = new Map<string, Trade[]>(),
    byProductDate = new Map<string, Trade[]>();
  for (const row of selected) {
    const p = byProduct.get(row.product_name);
    if (p) p.push(row);
    else byProduct.set(row.product_name, [row]);
    const key = JSON.stringify([row.product_name, row.trade_date]),
      d = byProductDate.get(key);
    if (d) d.push(row);
    else byProductDate.set(key, [row]);
  }
  const series = names.map((name) => ({
    name,
    points: dates.map((date) => ({
      label: date,
      ...measure(
        byProductDate.get(JSON.stringify([name, date])) ?? [],
        request,
      ),
    })),
  }));
  const breakdown = [...byProduct]
    .map(([name, records]) => ({
      name,
      ...measure(records, request),
    }))
    .sort((a, b) =>
      a.value === null
        ? 1
        : b.value === null
          ? -1
          : new D(b.value).comparedTo(a.value),
    );
  return {
    selection: request,
    summary: summarize(selected),
    measure: measure(selected, request),
    comparison: hasComparison
      ? comparison(measure(selected, request), measure(baseline, request))
      : null,
    series,
    breakdown: breakdown.slice(0, 10),
    rows: selected.slice(0, 10),
    selectedCount: selected.length,
    options: {
      products: [...new Set(rows.map((t) => t.product_name))].sort(),
      currencies: [
        ...new Set(rows.flatMap((t) => (t.currency ? [t.currency] : []))),
      ].sort(),
      units: [...new Set(rows.map((t) => t.unit))].sort(),
      contractTypes: [...new Set(rows.map((t) => t.contract_type))].sort(),
      dates: [...new Set(rows.map((t) => t.trade_date))].sort(),
    },
    definition:
      request.metric === "count"
        ? "Count of matching stored transaction records."
        : request.metric === "value"
          ? `Sum of price × quantity in ${request.currency}; only known, matching price and quantity units.`
          : `Reported quantity in ${request.unit} only. No cross-unit conversion.`,
    warnings: [
      ...(selected.length
        ? []
        : [
            "No records match this selection. This does not establish that no exchange trading occurred.",
          ]),
      ...(measure(selected, request).excluded
        ? [
            `${measure(selected, request).excluded} records are not eligible for the selected metric.`,
          ]
        : []),
      "Charts omit unavailable observations; gaps do not imply zero trading.",
    ],
  };
}
export type Workspace = ReturnType<typeof workspace>;
