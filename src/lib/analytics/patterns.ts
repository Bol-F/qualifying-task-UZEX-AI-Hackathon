import Decimal from "decimal.js";
import type { Trade } from "@/types";
import { shiftDate } from "@/lib/ai/dates";
import { summarize } from "./calculations";
import { hasValue, tradeValue } from "./accounting";
export type Pattern = {
  id: string;
  type: "Statistical observation" | "Data-quality warning";
  title: string;
  reason: string;
  recordIds: string[];
  filters: Record<string, string>;
  method: string;
};
export function detectPatterns(rows: Trade[]) {
  const findings: Pattern[] = [];
  const add = (item: Omit<Pattern, "id">) => {
    if (findings.length < 50)
      findings.push({ ...item, id: `pattern-${findings.length + 1}` });
  };
  const groups = new Map<string, Trade[]>(),
    ids = new Map<string, Trade[]>();
  for (const t of rows) {
    if (hasValue(t)) {
      const key = `${t.currency} / ${t.unit}`;
      const group = groups.get(key);
      if (group) group.push(t);
      else groups.set(key, [t]);
    }
    if (t.external_id) {
      const key = JSON.stringify([t.data_source, t.external_id]);
      const group = ids.get(key);
      if (group) group.push(t);
      else ids.set(key, [t]);
    }
  }
  for (const [group, trades] of groups) {
    if (trades.length < 8) continue;
    const values = trades.map(tradeValue).sort((a, b) => a.comparedTo(b));
    const q1 = values[Math.floor((values.length - 1) * 0.25)],
      q3 = values[Math.floor((values.length - 1) * 0.75)],
      threshold = q3.plus(q3.minus(q1).times(3));
    for (const t of trades)
      if (tradeValue(t).gt(threshold))
        add({
          type: "Statistical observation",
          title: "Large reported transaction value",
          reason: `Value exceeds Q3 + 3 × IQR (${threshold.toFixed()} ${group}) within this comparable currency/unit group.`,
          recordIds: [t.id],
          filters: { search: t.external_id ?? t.id },
          method:
            "Upper outer IQR fence; minimum 8 comparable records. Product mix can explain large values; this is not a price anomaly or an assessment of intent.",
        });
  }
  for (const repeated of ids.values())
    if (repeated.length > 1)
      add({
        type: "Data-quality warning",
        title: "Repeated external source identifier",
        reason: `${repeated.length} records share external identifier ${repeated[0].external_id} within the same source. Contract numbers are intentionally not tested for uniqueness.`,
        recordIds: repeated.slice(0, 10).map((t) => t.id),
        filters: { search: repeated[0].external_id! },
        method:
          "Exact equality of source label and external identifier; repeated imports or source conventions may explain this.",
      });
  const days = summarize(rows).daily;
  for (let i = 1; i < days.length; i++) {
    const a = days[i - 1],
      b = days[i],
      delta = new Decimal(b.count).minus(a.count).div(a.count).times(100);
    if (a.count >= 5 && delta.abs().gte(50))
      add({
        type: "Statistical observation",
        title: "Change in reported daily activity",
        reason: `Stored count changed from ${a.count} to ${b.count} (${delta.toFixed(2)}%) between ${a.date} and ${b.date}.`,
        recordIds: rows
          .filter((t) => t.trade_date === b.date)
          .slice(0, 5)
          .map((t) => t.id),
        filters: { from: a.date, to: b.date },
        method:
          "Absolute count change ≥50%, baseline ≥5 records. Small datasets can be volatile.",
      });
    if (shiftDate(a.date, 1) < b.date)
      add({
        type: "Statistical observation",
        title: "Gap in available observations",
        reason: `No selected records are available between ${a.date} and ${b.date}. This may reflect non-trading days or incomplete source coverage.`,
        recordIds: [],
        filters: { from: shiftDate(a.date, 1), to: shiftDate(b.date, -1) },
        method:
          "Calendar gap between adjacent observed dates; no trading calendar or completeness guarantee is assumed.",
      });
  }
  const irregular = rows.filter(
    (t) =>
      !t.currency ||
      t.price_unit !== t.unit ||
      new Decimal(t.quantity).isZero() ||
      new Decimal(t.price).isZero(),
  );
  if (irregular.length)
    add({
      type: "Data-quality warning",
      title: "Records needing accounting review",
      reason: `${irregular.length} records have an unknown currency, mismatched or unknown price basis, or zero price/quantity. These conditions are not evidence of wrongdoing.`,
      recordIds: irregular.slice(0, 10).map((t) => t.id),
      filters: {},
      method:
        "Explicit field checks. Zero values may be legitimate; source verification is required.",
    });
  return {
    findings,
    checkedRecords: rows.length,
    methods: [
      "Q3 + 3 × IQR by currency and unit (minimum 8 records)",
      "Daily count change ≥50% with baseline ≥5",
      "Observed calendar gaps; no zero filling",
      "Repeated external IDs within one source",
      "Currency, price-basis and zero-value checks",
    ],
    limited: findings.length === 50,
  };
}
