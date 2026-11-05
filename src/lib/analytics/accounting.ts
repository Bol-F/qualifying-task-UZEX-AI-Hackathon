import Decimal from "decimal.js";
import type { Trade } from "@/types";

export const Financial = Decimal.clone({ precision: 64 });
export function isCancelled(t: Trade) {
  return /аннулирован|cancelled|canceled/i.test(t.execution_status);
}
export function hasValue(t: Trade) {
  return !isCancelled(t) && !!t.currency && t.price_unit === t.unit;
}
// A registry amount is authoritative: dividing it into a unit price can recur.
export function tradeValue(t: Trade) {
  return t.total_amount !== undefined
    ? new Financial(t.total_amount)
    : new Financial(t.price).times(t.quantity);
}
