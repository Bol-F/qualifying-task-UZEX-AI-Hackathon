import type { Filters, Trade } from "@/types";
import Decimal from "decimal.js";
export function filterDemo(rows: Trade[], f: Filters) {
  return rows
    .filter(
      (t) =>
        (!f.search ||
          [
            t.normalized_product_name,
            t.contract_number,
            t.external_id ?? "",
            t.id,
          ].some((v) => v.toLowerCase().includes(f.search.toLowerCase()))) &&
        (!f.from || t.trade_date >= f.from) &&
        (!f.to || t.trade_date <= f.to) &&
        (!f.currency || t.currency === f.currency) &&
        (!f.id || t.id === f.id) &&
        (!f.productName || t.product_name === f.productName) &&
        (!f.productNames?.length || f.productNames.includes(t.product_name)) &&
        (!f.contractType || t.contract_type === f.contractType) &&
        (!f.contractNumber || t.contract_number === f.contractNumber) &&
        (!f.unit || t.unit === f.unit) &&
        (!f.priceUnit || t.price_unit === f.priceUnit) &&
        (!f.status || t.execution_status === f.status) &&
        (f.minQuantity === undefined ||
          new Decimal(t.quantity).gte(f.minQuantity)) &&
        (f.maxQuantity === undefined ||
          new Decimal(t.quantity).lte(f.maxQuantity)) &&
        (f.minPrice === undefined || new Decimal(t.price).gte(f.minPrice)) &&
        (f.maxPrice === undefined || new Decimal(t.price).lte(f.maxPrice)),
    )
    .sort((a, b) => {
      const v =
        f.sort === "price" || f.sort === "quantity"
          ? new Decimal(a[f.sort]).comparedTo(b[f.sort])
          : String(a[f.sort]).localeCompare(String(b[f.sort]));
      return (f.order === "asc" ? v : -v) || a.id.localeCompare(b.id);
    });
}
