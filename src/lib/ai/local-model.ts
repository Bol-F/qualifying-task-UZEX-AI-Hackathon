import type { AgentModel } from "./provider";
import type { AgentContext } from "./tool-runner";
import { interpretDates, shiftDate, tashkentToday } from "./dates";
import { normalizeProduct } from "@/lib/utils/product";
import { AgentError } from "./errors";
function languageOnly(question: string) {
  return (
    question.length <= 150 &&
    /answer|javob|natija|ответ|результат|тушунтир|tushuntir|explain|endi|теперь/i.test(
      question,
    ) &&
    /uzbek|o.zbek|ўзбек|узбек|русском|ruscha|русча|russian/i.test(question) &&
    !/\d|karbam|карбам|gold|oltin|золот|график|grafik|chart/i.test(question)
  );
}
export function localToolPlan(
  question: string,
  context: AgentContext,
  today = tashkentToday(),
): { name: string; args: Record<string, unknown> } {
  const text = question.toLowerCase(),
    dates = interpretDates(text, today);
  const filters = { ...context.filters };
  const normalized = normalizeProduct(text);
  const product = [
    "urea",
    "cement",
    "wheat",
    "cotton",
    "diesel",
    "copper",
    "polyethylene",
    "natural gas",
  ].find((p) => normalized.includes(p));
  if (product) filters.search = product;
  else if (/gold|oltin|олтин|золот/.test(text)) filters.search = "gold";
  if (dates.length === 1) {
    filters.from = dates[0];
    filters.to = dates[0];
  }
  if (/all data|все данные|barcha ma.lumot/.test(text)) {
    delete filters.from;
    delete filters.to;
    delete filters.search;
  }
  if (/предыдущ|previous|oldingi|аввалги/.test(text)) {
    if (!filters.from || !filters.to)
      throw new AgentError("INVALID_REQUEST", 400);
    return {
      name: "compare_trading_periods",
      args: {
        filters,
        metric: "count",
        periodA: { from: filters.from, to: filters.to },
        ...(/доступн|available|mavjud/.test(text)
          ? { previousAvailableDay: true }
          : {}),
        periodB: {
          from: shiftDate(filters.from, -1),
          to: shiftDate(filters.to, -1),
        },
        visualization: "bar",
      },
    };
  }
  if (dates.length === 2)
    return {
      name: "compare_trading_periods",
      args: {
        filters,
        metric: "count",
        periodA: { from: dates[0], to: dates[0] },
        periodB: { from: dates[1], to: dates[1] },
        visualization: "bar",
      },
    };
  if (
    /сравни|compare|solishtir|таққосла/.test(text) &&
    /доступн|available|mavjud/.test(text) &&
    /два|two|ikki|икки/.test(text)
  )
    return {
      name: "compare_trading_periods",
      args: {
        filters,
        metric: "count",
        lastTwoAvailableDays: true,
        visualization: "bar",
      },
    };
  const term =
    /биржев\S*\s+сделк|exchange transaction|birja bitimi|биржа битими/.test(
      text,
    )
      ? "transaction"
      : /аукцион|auksion|auction/.test(text)
        ? "auction"
        : /статус|holat|ҳолат|status/.test(text)
          ? "status"
          : /спот|spot/.test(text)
            ? "spot"
            : /форвард|forvard|forward/.test(text)
              ? "forward"
              : /база цены|narx bazasi/.test(text)
                ? "price_basis"
                : /бирж|birja|exchange/.test(text) &&
                    /что|nima|нима|what/.test(text)
                  ? "exchange"
                  : /что такое сделка|bitim nima/.test(text)
                    ? "transaction"
                    : undefined;
  if (term) return { name: "explain_exchange_term", args: { term } };
  const chart = /график|диаграм|chart|grafik|chizma|чизма|динамик|trend/.test(
    text,
  );
  const type = /pie|donut|кругов|doira/.test(text)
    ? "donut"
    : /area|площад|maydon/.test(text)
      ? "area"
      : /bar|столб|ustun/.test(text)
        ? "bar"
        : "line";
  if (
    (chart || /сравни|compare|solishtir/.test(text)) &&
    /urea|carbamide|карбам|karbam/.test(text) &&
    /gold|oltin|золот/.test(text)
  )
    return {
      name: "compare_trading_periods",
      args: {
        filters: { ...filters, search: undefined },
        metric: "count",
        commodities: ["urea", "gold"],
        visualization: "bar",
      },
    };
  if (/active commodities|активн.*товар|faol.*mahsulot/.test(text) && chart)
    return {
      name: "get_top_commodities",
      args: {
        filters,
        metric: "count",
        limit: /ten|десят|10/.test(text) ? 10 : 5,
        visualization: type === "line" ? "bar" : type,
      },
    };
  if (chart || /trading days|торговых дней|savdo kun|савдо кун/.test(text)) {
    const n = text.match(/(?:last|последн\S*|oxirgi|охирги)\s+(\d+)/)?.[1];
    return {
      name: "get_transaction_trends",
      args: {
        filters,
        metric: "count",
        visualization: type,
        ...(n
          ? { lastTradingDays: Math.min(90, Number(n)) }
          : /seven|семь|yetti|етти/.test(text)
            ? { lastTradingDays: 7 }
            : {}),
      },
    };
  }
  if (/largest|катта|katta|крупн|больш|eng katta/.test(text))
    return {
      name: "search_trades",
      args: {
        filters,
        sort: "quantity",
        order: "desc",
        limit: Number(text.match(/\b([1-9]|10)\b/)?.[1] ?? 5),
      },
    };
  if (/faol|актив|active|ko.p savdo/.test(text))
    return {
      name: "get_top_commodities",
      args: { filters, metric: "count", limit: 5, visualization: "bar" },
    };
  if (languageOnly(text) && context.lastTool)
    return {
      name: context.lastTool,
      args:
        context.lastTool === "get_trade_details" ||
        context.lastTool === "explain_exchange_term"
          ? { ...context.lastArgs }
          : { ...context.lastArgs, filters },
    };
  return {
    name:
      product ||
      filters.search ||
      /сделк|bitim|битим|transaction|trade/.test(text)
        ? "search_trades"
        : "get_market_overview",
    args: { filters },
  };
}
export function createLocalModel(
  question: string,
  context: AgentContext,
  explicitlyLocal = false,
): AgentModel {
  let called = false;
  return {
    engine: explicitlyLocal
      ? "Local query mode · Gemini not active"
      : "Local query mode · Gemini not configured",
    async generate() {
      if (!called) {
        called = true;
        const plan = localToolPlan(question, context);
        if (
          /all data|все данные|barcha ma.lumot/.test(question.toLowerCase()) &&
          "filters" in plan.args
        )
          plan.args.resetFilters = true;
        return {
          role: "model",
          parts: [{ functionCall: { name: plan.name, args: plan.args } }],
        };
      }
      return { role: "model", parts: [{ text: '{"focus":"latest"}' }] };
    },
  };
}
// Repeated sorts and available-day count comparisons add no new language-model value.
// Keep these narrow, context-bound actions deterministic and label their engine honestly.
export function deterministicFollowup(
  question: string,
  context: AgentContext,
): AgentModel | undefined {
  if (languageOnly(question) && context.lastTool) {
    const model = createLocalModel(question, context);
    return {
      ...model,
      engine: "Validated follow-up · deterministic data action",
    };
  }
  if (
    !context.filters.search ||
    !context.filters.from ||
    !context.filters.to ||
    question.length > 180
  )
    return undefined;
  const text = question.toLowerCase();
  const simpleSort =
    /^(?:endi|энди|теперь|now)(?:\s|$)/iu.test(text) &&
    /katta|катта|largest|крупнейш|больш/.test(text) &&
    !/qiymat|стоим|price|narx|value|цен/.test(text);
  const previousCount =
    /доступн|available|mavjud/.test(text) &&
    /предыдущ|previous|oldingi/.test(text) &&
    /количеств|count|son|сони/.test(text);
  if (!simpleSort && !previousCount) return undefined;
  const model = createLocalModel(question, context);
  model.engine = "Validated follow-up · deterministic data action";
  return model;
}
