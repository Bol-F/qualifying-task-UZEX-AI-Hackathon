import { createHash, randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { summarize } from "@/lib/analytics/calculations";
import type { Trade, Filters } from "@/types";
import type { Language } from "@/lib/i18n";
import {
  scopeSchema,
  evidenceSchema,
  type QueryScope,
  type Evidence,
  type Coverage,
} from "./contracts";
import { toolSchemas, type ToolName } from "./registry";
import { retrieveKnowledge } from "./knowledge";
import { AgentError } from "./errors";
const D = Decimal.clone({ precision: 64 });
export interface TradeStore {
  mode: "demo" | "live";
  read(filters: Partial<Filters>, signal: AbortSignal): Promise<Trade[]>;
  coverage(signal: AbortSignal): Promise<Coverage>;
}
export type AgentContext = {
  filters: QueryScope;
  referencedIds: string[];
  lastTool?: ToolName;
  lastArgs?: Record<string, unknown>;
};
export type ToolResult = {
  evidence: Evidence;
  context: AgentContext;
  visualization?: "line" | "bar" | "area" | "donut";
};
const titles: Record<ToolName, { uz: string; ru: string }> = {
  search_trades: { uz: "Bitimlar natijalari", ru: "Результаты анализа" },
  get_trade_details: { uz: "Bitim tafsilotlari", ru: "Детали сделки" },
  get_market_overview: { uz: "Bozor sharhi", ru: "Обзор рынка" },
  get_top_commodities: { uz: "Faol mahsulotlar", ru: "Активные товары" },
  compare_trading_periods: {
    uz: "Davrlar taqqoslanishi",
    ru: "Сравнение периодов",
  },
  get_transaction_trends: { uz: "Savdo dinamikasi", ru: "Динамика торгов" },
  explain_exchange_term: {
    uz: "Birja ma’lumotnomasi",
    ru: "Биржевой справочник",
  },
};
function checkScope(scope: QueryScope) {
  if (scope.from && scope.to && scope.from > scope.to)
    throw new AgentError("INVALID_REQUEST", 400);
  if (
    scope.minQuantity !== undefined &&
    scope.maxQuantity !== undefined &&
    scope.minQuantity > scope.maxQuantity
  )
    throw new AgentError("INVALID_REQUEST", 400);
  if (
    (scope.minPrice !== undefined || scope.maxPrice !== undefined) &&
    (!scope.currency || !scope.unit)
  )
    throw new AgentError("INVALID_REQUEST", 400);
  if (
    (scope.minQuantity !== undefined || scope.maxQuantity !== undefined) &&
    !scope.unit
  )
    throw new AgentError("INVALID_REQUEST", 400);
  if (
    scope.minPrice !== undefined &&
    scope.maxPrice !== undefined &&
    scope.minPrice > scope.maxPrice
  )
    throw new AgentError("INVALID_REQUEST", 400);
}
function metricValue(rows: Trade[], metric: string, scope: QueryScope) {
  if (metric === "count")
    return { value: String(rows.length), unit: "transactions" };
  const stats = summarize(rows);
  if (metric === "value") {
    if (!scope.currency) throw new AgentError("INVALID_REQUEST", 400);
    if (
      rows.length &&
      !rows.some(
        (t) => t.currency === scope.currency && t.price_unit === t.unit,
      )
    )
      throw new AgentError("DATA_UNAVAILABLE", 422);
    return { value: stats.values[scope.currency] ?? "0", unit: scope.currency };
  }
  if (!scope.unit) throw new AgentError("INVALID_REQUEST", 400);
  return { value: stats.quantities[scope.unit] ?? "0", unit: scope.unit };
}
export async function executeTool(
  name: ToolName,
  raw: unknown,
  context: AgentContext,
  store: TradeStore,
  lang: Language,
  signal: AbortSignal,
): Promise<ToolResult> {
  signal.throwIfAborted();
  const parsed = toolSchemas[name].safeParse(raw);
  if (!parsed.success) throw new AgentError("INVALID_TOOL", 400);
  const args = parsed.data as Record<string, unknown>;
  const scope = scopeSchema.parse({
    ...(args.resetFilters === true ? {} : context.filters),
    ...((args.filters ?? {}) as QueryScope),
  });
  checkScope(scope);
  let rows: Trade[] = [],
    metrics: Evidence["metrics"] = [],
    points: Evidence["points"] = [],
    unit = "transactions";
  const warnings: string[] = [];
  const coverage = await store.coverage(signal);
  let knowledge: Evidence["knowledge"];
  let matched = 0;
  let calculationRows: Trade[] = [];
  if (name === "explain_exchange_term")
    knowledge = retrieveKnowledge(String(args.term), lang);
  else if (name === "get_trade_details") {
    rows = await store.read({ id: String(args.id) }, signal);
    matched = rows.length;
  } else if (name === "compare_trading_periods") {
    const a = args.periodA as { from: string; to: string } | undefined;
    let b = args.periodB as { from: string; to: string } | undefined;
    const commodities = args.commodities as string[] | undefined;
    if (args.previousAvailableDay) {
      if (!a || a.from !== a.to) throw new AgentError("INVALID_REQUEST", 400);
      const available = await store.read(
        { ...scope, from: undefined, to: undefined },
        signal,
      );
      const date = [...new Set(available.map((t) => t.trade_date))]
        .filter((d) => d < a.from)
        .sort()
        .at(-1);
      b = date ? { from: date, to: date } : undefined;
      args.periodB = b;
      if (!b)
        warnings.push(
          "No previous available trading date exists for these source filters.",
        );
    }
    const first = await store.read(
      { ...scope, ...a, ...(commodities ? { search: commodities[0] } : {}) },
      signal,
    );
    const second = commodities
      ? await store.read({ ...scope, ...a, search: commodities[1] }, signal)
      : b
        ? await store.read({ ...scope, ...b }, signal)
        : [];
    const metricUnit =
      args.metric === "count"
        ? "transactions"
        : args.metric === "value"
          ? (scope.currency ?? "")
          : (scope.unit ?? "");
    const va = first.length
      ? metricValue(first, String(args.metric), scope)
      : { value: null, unit: metricUnit };
    const vb = second.length
      ? metricValue(second, String(args.metric), scope)
      : { value: null, unit: metricUnit };
    unit = va.unit;
    points = [
      {
        label:
          commodities?.[0] ?? (a ? `${a.from} -> ${a.to}` : "Selected records"),
        value: va.value,
      },
      {
        label:
          commodities?.[1] ??
          (b ? `${b.from} -> ${b.to}` : "Previous period unavailable"),
        value: vb.value,
      },
    ];
    metrics = [
      { label: points[0].label, ...va },
      { label: points[1].label, ...vb },
      {
        label: lang === "ru" ? "Delta B - A" : "Farq B - A",
        value:
          va.value !== null && vb.value !== null
            ? new D(vb.value).minus(va.value).toFixed()
            : null,
        unit,
      },
    ];
    if (va.value === null || vb.value === null)
      warnings.push(
        "Missing comparison observations are unavailable, not zero.",
      );
    rows = [...first, ...second];
    calculationRows = rows;
    matched = new Set(rows.map((r) => r.id)).size;
    if (a && b) {
      args.periodA = a;
      args.periodB = b;
    }
  } else {
    rows = await store.read(scope, signal);
    calculationRows = rows;
    matched = rows.length;
    const stats = summarize(rows);
    if (name === "search_trades") {
      const sort = String(args.sort);
      if (
        sort === "quantity" &&
        !scope.unit &&
        new Set(rows.map((t) => t.unit)).size > 1
      )
        throw new AgentError("INVALID_REQUEST", 400);
      if (sort === "price" && (!scope.currency || !scope.unit))
        throw new AgentError("INVALID_REQUEST", 400);
      if (sort === "value" && !scope.currency)
        throw new AgentError("INVALID_REQUEST", 400);
      if (sort !== "trade_date")
        rows = rows
          .filter(
            (t) =>
              (sort !== "value" || (t.price_unit === t.unit && !!t.currency)) &&
              (sort !== "price" || t.price_unit === scope.unit),
          )
          .sort((a, b) => {
            const av =
                sort === "value"
                  ? new D(a.price).times(a.quantity)
                  : new D(a[sort === "price" ? "price" : "quantity"]),
              bv =
                sort === "value"
                  ? new D(b.price).times(b.quantity)
                  : new D(b[sort === "price" ? "price" : "quantity"]);
            return (
              av.comparedTo(bv) * (args.order === "asc" ? 1 : -1) ||
              a.id.localeCompare(b.id)
            );
          });
      rows = rows.slice(0, Number(args.limit));
      metrics = [
        {
          label: lang === "ru" ? "Найдено сделок" : "Topilgan bitimlar",
          value: String(matched),
          unit,
        },
      ];
    }
    if (name === "get_market_overview") {
      metrics = [
        {
          label: lang === "ru" ? "Сделки" : "Bitimlar",
          value: String(stats.count),
          unit,
        },
        ...Object.entries(stats.values).map(([u, v]) => ({
          label: lang === "ru" ? "Стоимость" : "Qiymat",
          value: v,
          unit: u,
        })),
        ...Object.entries(stats.quantities).map(([u, v]) => ({
          label: lang === "ru" ? "Количество" : "Miqdor",
          value: v,
          unit: u,
        })),
      ].slice(0, 30);
      points = stats.products
        .slice(0, 10)
        .map((p) => ({ label: p.name, value: String(p.count) }));
    }
    if (name === "get_top_commodities") {
      const groups = new Map<string, Trade[]>();
      for (const t of rows.filter(
        (t) => args.metric !== "value" || t.price_unit === t.unit,
      ))
        groups.set(t.product_name, [...(groups.get(t.product_name) ?? []), t]);
      points = [...groups]
        .map(([label, records]) => ({
          label,
          ...metricValue(records, String(args.metric), scope),
        }))
        .sort((a, b) => new D(b.value).comparedTo(a.value))
        .slice(0, Number(args.limit));
      unit = metricValue([], String(args.metric), scope).unit;
      metrics = points.map((p) => ({ label: p.label, value: p.value, unit }));
    }
    if (name === "get_transaction_trends") {
      const dates = [...new Set(rows.map((r) => r.trade_date))].sort();
      if (args.lastTradingDays) {
        const selected = new Set(dates.slice(-Number(args.lastTradingDays)));
        rows = rows.filter((r) => selected.has(r.trade_date));
        calculationRows = rows;
        matched = rows.length;
        if (rows.length) {
          const actualDates = [...selected].sort();
          scope.from = actualDates[0];
          scope.to = actualDates.at(-1);
        }
      }
      const groups = new Map<string, Trade[]>();
      for (const row of rows)
        groups.set(row.trade_date, [
          ...(groups.get(row.trade_date) ?? []),
          row,
        ]);
      points = [...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, records]) => ({
          label,
          ...metricValue(records, String(args.metric), scope),
        }));
      if (points.length > 90) throw new AgentError("DATA_LIMIT", 422);
      unit = metricValue([], String(args.metric), scope).unit;
      metrics = [
        {
          label:
            lang === "ru" ? "Доступные торговые дни" : "Mavjud savdo kunlari",
          value: String(points.length),
          unit: "days",
        },
        {
          label: lang === "ru" ? "Итого" : "Jami",
          ...metricValue(rows, String(args.metric), scope),
        },
      ];
    }
    if (stats.excluded)
      warnings.push(
        lang === "ru"
          ? `${stats.excluded} записей исключены из расчёта стоимости: неизвестна валюта или не совпадает база цены.`
          : `${stats.excluded} yozuv qiymatdan chiqarildi: valyuta noma’lum yoki narx bazasi mos emas.`,
      );
  }
  if (!matched && !knowledge)
    warnings.push(
      lang === "ru"
        ? "По этим фильтрам записей нет. Это не доказывает отсутствие сделок на бирже."
        : "Bu filtrlar bo‘yicha yozuv yo‘q. Bu birjada bitim bo‘lmaganini isbotlamaydi.",
    );
  if (
    !knowledge &&
    coverage.from &&
    ((scope.from && scope.from < coverage.from) ||
      (scope.to && scope.to > coverage.to!))
  )
    warnings.push(
      lang === "ru"
        ? "Запрошенный период выходит за границы доступного набора."
        : "So‘ralgan davr mavjud ma’lumotlar chegarasidan tashqarida.",
    );
  const evidence = evidenceSchema.parse({
    id: randomUUID(),
    tool: name,
    mode: store.mode,
    title: titles[name][lang],
    filters: knowledge ? {} : scope,
    selection: {
      sort: args.sort,
      order: args.order,
      metric: args.metric,
      limit: args.limit,
    },
    periods:
      name === "compare_trading_periods" && args.periodA && args.periodB
        ? [args.periodA, args.periodB]
        : undefined,
    metrics,
    rows: rows.slice(0, Math.min(Number(args.limit ?? 5), 10)),
    points: points.map((p) => ({ label: p.label, value: p.value })),
    unit,
    matchedRecords: matched,
    coverage,
    recordIds: [
      ...new Set([...rows, ...calculationRows].map((r) => r.id)),
    ].slice(0, 20),
    fingerprint: createHash("sha256")
      .update(
        JSON.stringify({
          scope,
          tool: name,
          arguments: args,
          rows: (calculationRows.length ? calculationRows : rows).map((r) => [
            r.id,
            r.price,
            r.quantity,
            r.unit,
            r.price_unit,
            r.currency,
            r.product_name,
            r.data_source,
            r.trade_date,
            r.imported_at,
          ]),
        }),
      )
      .digest("hex"),
    warnings,
    knowledge,
  });
  return {
    evidence,
    context: {
      filters:
        name === "get_trade_details" || name === "explain_exchange_term"
          ? context.filters
          : scope,
      referencedIds: evidence.recordIds,
      lastTool: name,
      lastArgs: args,
    },
    visualization: args.visualization as ToolResult["visualization"],
  };
}
