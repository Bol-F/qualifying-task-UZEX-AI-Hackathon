import type { Content } from "@google/genai";
import { z } from "zod";
import {
  answerSchema,
  chartSchema,
  type AgentAnswer,
  type Activity,
} from "./contracts";
import { executeTool, type TradeStore } from "./tool-runner";
import { toolNames, type ToolName } from "./registry";
import { AgentError, logEvent } from "./errors";
import type { AgentModel } from "./provider";
import type { Session } from "./memory";
import { boundHistory } from "./memory";
import { detectLanguage, type Language } from "@/lib/i18n";
import { agentPrompt } from "./prompts";
const presentationSchema = z.object({
  focus: z.string().max(100).default("latest"),
  chart: z
    .object({
      type: z.enum(["line", "bar", "area", "donut"]),
      evidenceId: z.string(),
    })
    .optional(),
});
export async function runAgent(
  input: { question: string; language: Language; regenerate?: boolean },
  session: Session,
  model: AgentModel,
  store: TradeStore,
  signal: AbortSignal,
  onActivity: (event: Activity) => void = () => {},
): Promise<{ session: Session; value: AgentAnswer }> {
  const started = Date.now();
  const base =
    input.regenerate && session.lastTurn
      ? {
          ...session,
          context: structuredClone(session.lastTurn.context),
          messages: structuredClone(session.lastTurn.messages),
        }
      : structuredClone(session);
  if (input.regenerate && !session.lastTurn)
    throw new AgentError("SESSION_EXPIRED", 409);
  const question = input.regenerate
    ? session.lastTurn!.question
    : input.question;
  const language = detectLanguage(question, input.language);
  const system = agentPrompt(base.context, language);
  const contents: Content[] = boundHistory([
    ...base.messages,
    { role: "user", content: question },
  ]).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const evidence: AgentAnswer["evidence"] = [];
  let context = structuredClone(base.context),
    requestedChart: AgentAnswer["chart"];
  let totalCalls = 0;
  let invalid = 0;
  let presentation: z.infer<typeof presentationSchema> | undefined;
  const modelWarnings: string[] = [];
  for (let round = 0; round < 4; round++) {
    signal.throwIfAborted();
    onActivity({ type: "activity", stage: "thinking" });
    let response: Content;
    try {
      const remaining = Math.max(1, 43000 - (Date.now() - started));
      const modelSignal = evidence.length
        ? AbortSignal.any([
            signal,
            AbortSignal.timeout(Math.min(12000, remaining)),
          ])
        : signal;
      response = await model.generate(contents, system, modelSignal);
    } catch (error) {
      if (
        evidence.length &&
        !signal.aborted &&
        (error instanceof AgentError ||
          ["AbortError", "TimeoutError"].includes(
            (error as { name?: string })?.name ?? "",
          ))
      ) {
        modelWarnings.push(
          language === "ru"
            ? "Пояснение Gemini недоступно; показаны проверенные расчёты и исходные записи."
            : "Gemini izohi mavjud emas; tekshirilgan hisoblar va manba yozuvlari ko‘rsatildi.",
        );
        break;
      }
      throw error;
    }
    contents.push(response);
    const calls =
      response.parts
        ?.filter((p) => p.functionCall)
        .map((p) => p.functionCall!) ?? [];
    if (!calls.length) {
      const text = response.parts?.map((p) => p.text ?? "").join("") ?? "";
      try {
        presentation = presentationSchema.parse(
          JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")),
        );
      } catch {
        presentation = undefined;
      }
      if (evidence.length) break;
      throw new AgentError("INVALID_TOOL");
    }
    if (totalCalls + calls.length > 6) throw new AgentError("TOOL_LIMIT", 422);
    const results: NonNullable<Content["parts"]> = [];
    for (const call of calls) {
      totalCalls++;
      const name = call.name as ToolName;
      onActivity({
        type: "activity",
        stage: "tool-start",
        tool: toolNames.includes(name) ? name : undefined,
      });
      try {
        if (!toolNames.includes(name))
          throw new AgentError("INVALID_TOOL", 400);
        const result = await executeTool(
          name,
          call.args,
          context,
          store,
          language,
          signal,
        );
        context = result.context;
        evidence.push(result.evidence);
        const chartRequested = /chart|график|диаграм|grafik|chizma/i.test(
          question,
        );
        const visual =
          result.visualization ??
          (chartRequested
            ? name === "get_transaction_trends"
              ? "line"
              : "bar"
            : undefined);
        if (visual && result.evidence.points.length)
          requestedChart = chartSchema.parse({
            type:
              visual === "donut" &&
              result.evidence.points.some(
                (p) => p.value === null || Number(p.value) < 0,
              )
                ? "bar"
                : visual,
            title: result.evidence.title,
            unit: result.evidence.unit,
            evidenceId: result.evidence.id,
            points: result.evidence.points,
          });
        results.push({
          functionResponse: {
            id: call.id,
            name,
            response: {
              evidenceId: result.evidence.id,
              metrics: result.evidence.metrics,
              points: result.evidence.points,
              matchedRecords: result.evidence.matchedRecords,
              filters: result.evidence.filters,
              coverage: result.evidence.coverage,
              warnings: result.evidence.warnings,
              recordIds: result.evidence.recordIds,
              untrustedRecords: result.evidence.rows.map((r) => ({
                id: r.id,
                product: r.product_name,
                price: r.price,
                quantity: r.quantity,
                unit: r.unit,
                currency: r.currency,
                source: r.data_source,
              })),
              knowledge: result.evidence.knowledge,
            },
          },
        });
        logEvent("ai.tool.completed", { tool: name });
      } catch (error) {
        if (
          !(error instanceof AgentError) ||
          !["INVALID_TOOL", "INVALID_REQUEST"].includes(error.code)
        )
          throw error;
        if (++invalid > 1) throw error;
        results.push({
          functionResponse: {
            id: call.id,
            name: call.name ?? "unknown",
            response: {
              error: error.code,
              instruction:
                "Correct arguments using the declared schema. Value needs currency, quantity needs unit. Never invent a result.",
            },
          },
        });
      }
      onActivity({
        type: "activity",
        stage: "tool-end",
        tool: toolNames.includes(name) ? name : undefined,
      });
    }
    contents.push({ role: "user", parts: results });
    if (round === 3) throw new AgentError("TOOL_LIMIT", 422);
  }
  if (!evidence.length) throw new AgentError("INVALID_TOOL");
  if (presentation?.chart) {
    const selected = evidence.find(
      (e) => e.id === presentation.chart!.evidenceId,
    );
    if (selected?.points.length)
      requestedChart = chartSchema.parse({
        type:
          presentation.chart.type === "donut" &&
          selected.points.some((p) => p.value === null || Number(p.value) < 0)
            ? "bar"
            : presentation.chart.type,
        title: selected.title,
        unit: selected.unit,
        evidenceId: selected.id,
        points: selected.points,
      });
  }
  // Only deterministic narratives and verified evidence are rendered. Model-authored facts never reach the UI.
  const selected =
    evidence.find((e) => e.id === presentation?.focus) ?? evidence.at(-1)!;
  const prefix =
    store.mode === "demo" || store.mode === "local"
      ? language === "ru"
        ? "**ДЕМО: синтетические данные, не реальные сделки UZEX.**"
        : "**DEMO: sun’iy ma’lumotlar, haqiqiy UZEX bitimlari emas.**"
      : language === "ru"
        ? "**Проверено по импортированным записям; не полный реестр биржи.**"
        : "**Import yozuvlari bo‘yicha tekshirildi; bu birjaning to‘liq reyestri emas.**";
  const summary =
    selected.knowledge?.text ??
    (selected.matchedRecords
      ? `${language === "ru" ? "Записей в анализе" : "Tahlildagi yozuvlar"}: **${selected.matchedRecords}**. ${language === "ru" ? "Числа рассчитаны приложением по сохранённым данным." : "Sonlar saqlangan ma’lumotlardan ilova tomonidan hisoblandi."}`
      : language === "ru"
        ? "По заданным фильтрам записей не найдено. Данные за этот период или товар недоступны в текущем наборе."
        : "Berilgan filtrlar bo‘yicha yozuv topilmadi. Ushbu davr yoki mahsulot ma’lumotlari joriy to‘plamda mavjud emas.");
  const text = `${prefix}\n\n### ${selected.title}\n\n${summary}`;
  const value = answerSchema.parse({
    text,
    language,
    engine: model.engine,
    conversationId: session.id,
    timestamp: new Date().toISOString(),
    evidence,
    chart: requestedChart,
    rows: selected.rows,
    context: { filters: context.filters, referencedIds: context.referencedIds },
    warnings: [
      ...new Set([...modelWarnings, ...evidence.flatMap((e) => e.warnings)]),
    ].slice(0, 12),
    followUps:
      language === "ru"
        ? [
            "Покажи график количества сделок.",
            "Теперь сравни с предыдущим днём.",
            "Теперь ответь на узбекском.",
          ]
        : [
            "Bitimlar sonini grafikda ko‘rsat.",
            "Endi oldingi kun bilan solishtir.",
            "Энди энг катта бештасини кўрсат.",
          ],
  });
  signal.throwIfAborted();
  logEvent("ai.completed", { durationMs: Date.now() - started });
  return {
    value,
    session: {
      ...base,
      context,
      messages: [
        ...base.messages,
        { role: "user", content: question },
        { role: "assistant", content: text },
      ],
      lastTurn: {
        question,
        context: base.context,
        messages: boundHistory(base.messages),
      },
      updatedAt: Date.now(),
    },
  };
}
