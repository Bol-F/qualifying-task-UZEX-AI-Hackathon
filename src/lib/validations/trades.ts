import { z } from "zod";
export const dateSchema = z.iso.date();
const decimal = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (v) => /^\d{1,18}(\.\d{1,6})?$/.test(v),
    "Expected nonnegative decimal with at most 6 decimal places",
  );
export const tradeSchema = z.object({
  id: z.string().max(150),
  external_id: z.string().max(150).nullable(),
  contract_number: z.string().min(1).max(120),
  trade_date: dateSchema,
  product_name: z.string().min(1).max(300),
  normalized_product_name: z.string().max(1000),
  price: decimal,
  quantity: decimal,
  unit: z.string().min(1).max(30),
  price_unit: z.string().max(30).nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  contract_type: z.string().max(64),
  execution_status: z.string().max(60),
  data_source: z.string().max(500),
  imported_at: z.iso.datetime({ offset: true }),
});
export const filtersSchema = z
  .object({
    search: z.string().max(120).default(""),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    minQuantity: z.coerce.number().nonnegative().optional(),
    maxQuantity: z.coerce.number().nonnegative().optional(),
    unit: z.string().max(30).optional(),
    contractNumber: z.string().max(120).optional(),
    status: z.string().max(60).optional(),
    id: z.string().max(150).optional(),
    productName: z.string().max(300).optional(),
    contractType: z.string().max(64).optional(),
    currency: z.string().length(3).optional(),
    sort: z
      .enum(["trade_date", "price", "quantity", "product_name"])
      .default("trade_date"),
    order: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(12),
  })
  .refine(
    (v) => !v.from || !v.to || v.from <= v.to,
    "Start date must precede end date",
  )
  .refine(
    (v) =>
      v.minPrice === undefined ||
      v.maxPrice === undefined ||
      v.minPrice <= v.maxPrice,
    "Invalid price range",
  )
  .refine(
    (v) =>
      (v.minPrice === undefined && v.maxPrice === undefined) || !!v.currency,
    "Choose currency for price filters",
  );
export type Trade = z.infer<typeof tradeSchema>;
export type Filters = z.infer<typeof filtersSchema>;
