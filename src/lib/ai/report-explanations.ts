import { z } from "zod";
import type { Fact } from "@/lib/analytics/insights";
export const explanationPlanSchema = z.object({
  sections: z
    .array(
      z.object({
        factId: z.string().max(40),
        angle: z.enum(["participation", "concentration", "coverage"]),
      }),
    )
    .max(3),
});
export type ReportModel = { select(facts: Fact[]): Promise<unknown> };
const angles = {
  participation:
    "Changes in reported activity describe this selection only. They do not establish a change in the entire exchange or predict future prices.",
  concentration:
    "A larger share of stored records describes dataset composition. Transaction frequency does not measure profitability, liquidity, or market power.",
  coverage:
    "Interpret this observation within the displayed coverage and source filters. Missing observations and incomplete imports can affect comparisons.",
};
export async function explainFacts(facts: Fact[], model?: ReportModel) {
  if (!model)
    return {
      mode: "deterministic" as const,
      items: facts.map((f) => ({
        factId: f.id,
        text: angles[
          f.kind === "activity"
            ? "participation"
            : f.kind === "share"
              ? "concentration"
              : "coverage"
        ],
      })),
      warning:
        "Gemini is not configured. This is a calculated report with deterministic explanations; no AI commentary was generated.",
    };
  const plan = explanationPlanSchema.parse(await model.select(facts));
  if (plan.sections.some((s) => !facts.some((f) => f.id === s.factId)))
    throw new Error("Unreferenced report fact");
  return {
    mode: "gemini-guided" as const,
    items: plan.sections.map((s) => ({
      factId: s.factId,
      text: angles[s.angle],
    })),
    warning: null,
  };
}
