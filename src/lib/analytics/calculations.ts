import Decimal from "decimal.js";
import type { Trade } from "@/types";
const Financial = Decimal.clone({ precision: 64 });
export function summarize(rows: Trade[]) {
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
  let excluded = 0;
  for (const t of rows) {
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
    d.quantities[t.unit] = new Financial(d.quantities[t.unit] ?? 0)
      .plus(t.quantity)
      .toFixed();
    if (t.currency && t.price_unit === t.unit) {
      const value = new Financial(t.price).times(t.quantity);
      values[t.currency] = (values[t.currency] ?? new Financial(0)).plus(value);
      d.values[t.currency] = new Financial(d.values[t.currency] ?? 0)
        .plus(value)
        .toFixed();
    } else excluded++;
  }
  return {
    count: rows.length,
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
    latest: rows.reduce<string | null>(
      (d, t) => (!d || t.trade_date > d ? t.trade_date : d),
      null,
    ),
    excluded,
  };
}
export type Analytics = ReturnType<typeof summarize>;
