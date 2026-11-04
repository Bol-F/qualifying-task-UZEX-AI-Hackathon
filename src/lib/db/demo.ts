import type { Trade } from "@/types";
// Deterministic synthetic fixture, never official UZEX records. Fixed dates prevent false freshness.
const products = [
  ["Urea (carbamide)", "karbamid карбамид urea", "2800000", "t"],
  ["Portland cement", "sement цемент cement", "640000", "t"],
  ["Wheat, grade 3", "bugdoy пшеница wheat", "3100000", "t"],
  ["Cotton fiber", "paxta хлопок cotton", "24500000", "t"],
  ["Diesel fuel", "dizel дизель diesel", "12500000", "t"],
  ["Copper cathode", "mis медь copper", "98000000", "t"],
  ["Polyethylene", "polietilen полиэтилен", "14500000", "t"],
  ["Natural gas", "gaz газ", "1500", "m³"],
];
export const demoTrades: Trade[] = Array.from({ length: 184 }, (_, i) => {
  const p = products[(i * 7 + (i % 3)) % products.length];
  return {
    id: `demo-${String(i + 1).padStart(4, "0")}`,
    external_id: `SYN-${100001 + i}`,
    contract_number: `DM-${2026000 + Math.floor(i / 2)}`,
    trade_date: `2026-10-${String(1 + Math.floor((i * 30) / 184)).padStart(2, "0")}`,
    product_name: p[0],
    normalized_product_name: `${p[0].toLowerCase()} ${p[1]}`,
    price: String(Number(p[2]) + (i % 7) * 1000),
    quantity: String(10 + ((i * 13) % 190)),
    unit: p[3],
    price_unit: p[3],
    currency: "UZS",
    contract_type: i % 4 ? "Spot" : "Forward",
    execution_status: i % 9 ? "Completed" : "Pending",
    data_source: "Synthetic demo fixture · not UZEX",
    imported_at: "2026-10-31T00:00:00.000Z",
  };
});
