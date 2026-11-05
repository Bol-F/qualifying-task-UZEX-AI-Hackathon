import { z } from "zod";
import Decimal from "decimal.js";
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
const filterDecimal = z.union([
  z.string().regex(/^\d{1,18}(\.\d{1,6})?$/),
  z.number().nonnegative(),
]);
export const filtersSchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(120)
      .refine(
        (v) => !/[\u0000-\u001f\u007f]/.test(v),
        "Search cannot contain control characters",
      )
      .refine(
        (v) => !v.includes("*"),
        "Wildcard search is not supported. Enter a literal commodity or identifier.",
      )
      .default(""),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    minPrice: filterDecimal.optional(),
    maxPrice: filterDecimal.optional(),
    minQuantity: filterDecimal.optional(),
    maxQuantity: filterDecimal.optional(),
    unit: z.string().max(30).optional(),
    priceUnit: z.string().min(1).max(30).optional(),
    contractNumber: z.string().max(120).optional(),
    status: z.string().max(60).optional(),
    id: z.string().max(150).optional(),
    productName: z.string().max(300).optional(),
    productNames: z.array(z.string().min(1).max(300)).max(3).optional(),
    contractType: z.string().max(64).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
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
      new Decimal(v.minPrice).lte(v.maxPrice),
    "Invalid price range",
  )
  .refine(
    (v) =>
      (v.minPrice === undefined && v.maxPrice === undefined) ||
      (!!v.currency && !!v.priceUnit),
    "Choose currency and quoted price basis for price filters",
  )
  .refine(
    (v) =>
      v.minQuantity === undefined ||
      v.maxQuantity === undefined ||
      new Decimal(v.minQuantity).lte(v.maxQuantity),
    "Invalid quantity range",
  )
  .refine(
    (v) =>
      (v.minQuantity === undefined && v.maxQuantity === undefined) || !!v.unit,
    "Choose a reported unit for quantity filters",
  );
export type Trade = z.infer<typeof tradeSchema>;
export type Filters = z.infer<typeof filtersSchema>;
