import type { SupabaseClient } from "@supabase/supabase-js";
import type { Filters } from "@/types";

// PostgREST quoted values escape its grammar; LIKE wildcards are escaped separately.
// User text stays a literal substring, including commas, parentheses, quotes and %.
export function literalSearch(value: string) {
  return JSON.stringify(`%${value.replace(/[\\%_]/g, "\\$&")}%`);
}
export function buildTradeQuery(db: SupabaseClient, f: Filters) {
  let q = db
    .from("trades")
    .select(
      "id,external_id,contract_number,trade_date,product_name,normalized_product_name,price::text,quantity::text,unit,price_unit,currency,contract_type,execution_status,data_source,imported_at",
      { count: "exact" },
    );
  if (f.search) {
    const value = literalSearch(f.search);
    q = q.or(
      ["normalized_product_name", "contract_number", "external_id", "id"]
        .map((column) => `${column}.ilike.${value}`)
        .join(","),
    );
  }
  if (f.from) q = q.gte("trade_date", f.from);
  if (f.productNames?.length) q = q.in("product_name", f.productNames);
  if (f.to) q = q.lte("trade_date", f.to);
  for (const [key, column] of [
    ["currency", "currency"],
    ["id", "id"],
    ["productName", "product_name"],
    ["contractType", "contract_type"],
    ["contractNumber", "contract_number"],
    ["unit", "unit"],
    ["priceUnit", "price_unit"],
    ["status", "execution_status"],
  ] as const) {
    if (f[key]) q = q.eq(column, f[key]);
  }
  if (f.minQuantity !== undefined) q = q.gte("quantity", f.minQuantity);
  if (f.maxQuantity !== undefined) q = q.lte("quantity", f.maxQuantity);
  if (f.minPrice !== undefined) q = q.gte("price", f.minPrice);
  if (f.maxPrice !== undefined) q = q.lte("price", f.maxPrice);
  return q.order(f.sort, { ascending: f.order === "asc" }).order("id");
}
