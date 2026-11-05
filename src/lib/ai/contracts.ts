import { z } from "zod";
import { tradeSchema, dateSchema } from "@/lib/validations/trades";
export const scopeSchema = z.strictObject({
  search: z.string().max(120).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  contractNumber: z.string().max(120).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  unit: z.string().max(30).optional(),
  minQuantity: z.number().nonnegative().optional(),
  maxQuantity: z.number().nonnegative().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  status: z.string().max(60).optional(),
});
export type QueryScope = z.infer<typeof scopeSchema>;
export const chartTypeSchema = z.enum(["line", "bar", "area", "donut"]);
export const chartSchema = z
  .strictObject({
    type: chartTypeSchema,
    title: z.string().max(180),
    unit: z.string().max(40),
    evidenceId: z.string(),
    points: z
      .array(
        z.strictObject({
          label: z.string().max(300),
          value: z
            .string()
            .regex(/^-?\d+(\.\d+)?$/)
            .nullable(),
        }),
      )
      .max(90),
  })
  .refine(
    (v) =>
      v.type !== "donut" ||
      v.points.every((p) => p.value !== null && Number(p.value) >= 0),
    "Donut values must be nonnegative",
  );
export const metricSchema = z.object({
  label: z.string().max(300),
  value: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .nullable(),
  unit: z.string().max(40),
});
export const coverageSchema = z.object({
  from: dateSchema.nullable(),
  to: dateSchema.nullable(),
  total: z.number().int().nonnegative(),
  latestImport: z.string().nullable(),
  missingYears: z.array(z.number().int()).optional(),
  missingBrokers: z.boolean().optional(),
});
export type Coverage = z.infer<typeof coverageSchema>;
export const evidenceSchema = z.object({
  id: z.string(),
  tool: z.string(),
  mode: z.enum(["demo", "live", "local"]),
  title: z.string(),
  filters: scopeSchema,
  selection: z
    .object({
      sort: z.string().optional(),
      order: z.string().optional(),
      metric: z.string().optional(),
      limit: z.number().optional(),
    })
    .optional(),
  periods: z
    .array(z.object({ from: dateSchema, to: dateSchema }))
    .length(2)
    .optional(),
  metrics: z.array(metricSchema).max(30),
  rows: z.array(tradeSchema).max(10),
  points: z
    .array(z.object({ label: z.string(), value: z.string().nullable() }))
    .max(90),
  unit: z.string(),
  matchedRecords: z.number().int().nonnegative(),
  coverage: coverageSchema,
  recordIds: z.array(z.string()).max(20),
  fingerprint: z.string(),
  warnings: z.array(z.string()).max(12),
  knowledge: z
    .object({
      text: z.string(),
      sources: z.array(
        z.object({ title: z.string(), url: z.url(), checkedAt: dateSchema }),
      ),
      scope: z.string(),
    })
    .optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export const answerSchema = z.object({
  text: z.string(),
  language: z.enum(["uz", "ru"]),
  engine: z.string(),
  conversationId: z.uuid(),
  stateToken: z.string().max(30000).optional(),
  timestamp: z.iso.datetime(),
  evidence: z.array(evidenceSchema).max(6),
  chart: chartSchema.optional(),
  followUps: z.array(z.string()).max(3),
  warnings: z.array(z.string()).max(12),
  context: z.object({
    filters: scopeSchema,
    referencedIds: z.array(z.string()).max(20),
  }),
  rows: z.array(tradeSchema).max(10),
});
export type AgentAnswer = z.infer<typeof answerSchema>;
export const activitySchema = z.object({
  type: z.literal("activity"),
  stage: z.enum(["thinking", "tool-start", "tool-end"]),
  tool: z.string().optional(),
});
export type Activity = z.infer<typeof activitySchema>;
export const streamEventSchema = z.discriminatedUnion("type", [
  activitySchema,
  z.object({ type: z.literal("answer"), answer: answerSchema }),
  z.object({ type: z.literal("error"), error: z.string(), code: z.string() }),
]);
export const chatRequestSchema = z
  .object({
    conversationId: z.uuid().optional(),
    stateToken: z.string().max(30000).optional(),
    message: z.string().trim().min(1).max(6000).optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1).max(6000),
        }),
      )
      .min(1)
      .max(24)
      .optional(),
    language: z.enum(["uz", "ru"]).default("uz"),
    regenerate: z.boolean().default(false),
  })
  .refine(
    (v) => !!v.message || v.messages?.at(-1)?.role === "user",
    "A user message is required",
  )
  .refine(
    (v) =>
      !v.messages ||
      v.messages.reduce((n, m) => n + m.content.length, 0) <= 24000,
    "Conversation is too large",
  );
