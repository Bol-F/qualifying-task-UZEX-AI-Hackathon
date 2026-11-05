import type { Trade } from "@/types";
import type Decimal from "decimal.js";
import { Financial, hasValue, isCancelled, tradeValue } from "./accounting";
export function summarize(rows: Iterable<Trade>) {
  const values: Record<string, Decimal> = Object.create(null),
    quantities: Record<string, Decimal> = Object.create(null),
    products: Record<string, number> = Object.create(null),
    daily: Record<
      string,
      {
        date: string;
        count: number;
        values: Record<string, string>;
        quantities: Record<string, string>;
      }
    > = Object.create(null);
  let excluded = 0,
    count = 0,
    latest: string | null = null,
    cancelled = 0;
  let convertedValueUZS: InstanceType<typeof Financial> | null = null;
  for (const t of rows) {
    count++;
    if (!latest || t.trade_date > latest) latest = t.trade_date;
    const cancelledTrade = isCancelled(t);
    if (cancelledTrade) cancelled++;
    if (!cancelledTrade)
      quantities[t.unit] = (quantities[t.unit] ?? new Financial(0)).plus(
        t.quantity,
      );
    products[t.product_name] = (products[t.product_name] ?? 0) + 1;
    const d = (daily[t.trade_date] ??= {
      date: t.trade_date,
      count: 0,
      values: Object.create(null),
      quantities: Object.create(null),
    });
    d.count++;
    if (!cancelledTrade)
      d.quantities[t.unit] = new Financial(d.quantities[t.unit] ?? 0)
        .plus(t.quantity)
        .toFixed();
    if (hasValue(t)) {
      const value = tradeValue(t),
        currency = t.currency!;
      values[currency] = (values[currency] ?? new Financial(0)).plus(value);
      d.values[currency] = new Financial(d.values[currency] ?? 0)
        .plus(value)
        .toFixed();
      if (t.amount_uzs !== undefined)
        convertedValueUZS = (convertedValueUZS ?? new Financial(0)).plus(
          t.amount_uzs,
        );
    } else excluded++;
  }
  return {
    count,
    cancelled,
    convertedValueUZS: convertedValueUZS?.toFixed() ?? null,
    values: Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.toFixed()]),
    ),
    quantities: Object.fromEntries(
      Object.entries(quantities).map(([k, v]) => [k, v.toFixed()]),
    ),
    products: Object.entries(products)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
    latest,
    excluded,
  };
}
export type Analytics = ReturnType<typeof summarize>;
