import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import { dateSchema } from "@/lib/validations/trades";
export const planSchema = z
  .object({
    intent: z.enum([
      "summary",
      "trades",
      "active",
      "compare",
      "glossary",
      "unsupported",
    ]),
    search: z.string().max(100).optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    dates: z.array(dateSchema).length(2).optional(),
    term: z
      .enum(["price_basis", "spot", "forward", "quantity", "exchange"])
      .optional(),
  })
  .refine(
    (v) => v.intent !== "compare" || !!v.dates,
    "Comparison needs two dates",
  )
  .refine((v) => !v.from || !v.to || v.from <= v.to, "Invalid date interval");
export type QueryPlan = z.infer<typeof planSchema>;
export const queryDeclaration: FunctionDeclaration = {
  name: "query_trades",
  description: "Select one approved read-only analysis or glossary operation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      intent: {
        type: Type.STRING,
        enum: [
          "summary",
          "trades",
          "active",
          "compare",
          "glossary",
          "unsupported",
        ],
      },
      search: { type: Type.STRING },
      from: { type: Type.STRING },
      to: { type: Type.STRING },
      dates: { type: Type.ARRAY, items: { type: Type.STRING } },
      term: {
        type: Type.STRING,
        enum: ["price_basis", "spot", "forward", "quantity", "exchange"],
      },
    },
    required: ["intent"],
  },
};
