import Decimal from "decimal.js";
import type { Trade } from "@/types";
import { summarize } from "./calculations";
export type Fact = {
  id: string;
  kind: "activity" | "share" | "concentration";
  statement: string;
  value: string;
  baseline: string;
  unit: string;
  filters: Record<string, string>;
  coverage: { from: string | null; to: string | null; records: number };
  recordIds: string[];
};
export function deriveInsights(rows: Trade[]): Fact[] {
  const stats = summarize(rows),
    dates = stats.daily;
  const coverage = {
    from: dates[0]?.date ?? null,
    to: stats.latest,
    records: rows.length,
  };
  const facts: Fact[] = [];
  if (dates.length >= 2) {
    const current = dates.at(-1)!,
      previous = dates.at(-2)!;
    const difference = current.count - previous.count;
    facts.push({
      id: "activity",
      kind: "activity",
      statement: `Stored transaction count ${difference > 0 ? "increased" : difference < 0 ? "decreased" : "was unchanged"} by ${Math.abs(difference)} on ${current.date} compared with the previous available trading date, ${previous.date}.`,
      value: String(current.count),
      baseline: String(previous.count),
      unit: "transactions",
      filters: { from: previous.date, to: current.date },
      coverage,
      recordIds: rows
        .filter(
          (r) =>
            r.trade_date === current.date || r.trade_date === previous.date,
        )
        .slice(0, 5)
        .map((r) => r.id),
    });
  }
  if (stats.products.length && rows.length) {
    const first = stats.products[0],
      share = new Decimal(first.count).div(rows.length).times(100).toFixed(2);
    facts.push({
      id: "share",
      kind: "share",
      statement: `${first.name} is among the most active commodities: ${first.count} records (${share}% of this selection).`,
      value: String(first.count),
      baseline: String(rows.length),
      unit: "transactions",
      filters: { productName: first.name },
      coverage,
      recordIds: rows
        .filter((r) => r.product_name === first.name)
        .slice(0, 5)
        .map((r) => r.id),
    });
    const top = stats.products.slice(0, 3).reduce((s, p) => s + p.count, 0);
    facts.push({
      id: "concentration",
      kind: "concentration",
      statement: `The ${Math.min(3, stats.products.length)} leading commodity categories account for ${new Decimal(top).div(rows.length).times(100).toFixed(2)}% of stored records.`,
      value: String(top),
      baseline: String(rows.length),
      unit: "transactions",
      filters: { from: coverage.from!, to: coverage.to! },
      coverage,
      recordIds: rows.slice(0, 5).map((r) => r.id),
    });
  }
  return facts;
}
