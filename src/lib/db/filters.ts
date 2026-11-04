import type { Filters, Trade } from "@/types";
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
        (!f.contractType || t.contract_type === f.contractType) &&
        (!f.contractNumber || t.contract_number === f.contractNumber) &&
        (!f.unit || t.unit === f.unit) &&
        (!f.status || t.execution_status === f.status) &&
        (f.minQuantity === undefined || Number(t.quantity) >= f.minQuantity) &&
        (f.maxQuantity === undefined || Number(t.quantity) <= f.maxQuantity) &&
        (f.minPrice === undefined || Number(t.price) >= f.minPrice) &&
        (f.maxPrice === undefined || Number(t.price) <= f.maxPrice),
    )
    .sort((a, b) => {
      const v =
        f.sort === "price" || f.sort === "quantity"
          ? Number(a[f.sort]) - Number(b[f.sort])
          : String(a[f.sort]).localeCompare(String(b[f.sort]));
      return (f.order === "asc" ? v : -v) || a.id.localeCompare(b.id);
    });
}
