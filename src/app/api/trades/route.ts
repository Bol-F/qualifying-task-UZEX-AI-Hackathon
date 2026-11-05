import { listTrades, allTrades } from "@/lib/db/queries";
import { authorize, failure } from "@/lib/utils/api";
import { filtersSchema } from "@/lib/validations/trades";
import { NextResponse } from "next/server";
import { csvCell } from "@/lib/utils/csv";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    const params = new URL(req.url).searchParams;
    const f = filtersSchema.parse({
      ...Object.fromEntries(params),
      productNames: params.has("product")
        ? params.getAll("product")
        : undefined,
    });
    if (params.get("export") === "csv") {
      const rows = await allTrades(f);
      const keys = [
        "id",
        "external_id",
        "contract_number",
        "trade_date",
        "product_name",
        "price",
        "quantity",
        "unit",
        "price_unit",
        "currency",
        "execution_status",
        "contract_type",
        "data_source",
        "imported_at",
        "total_amount",
        "amount_uzs",
        "usd_rate",
        "lot_count",
        "lot_size",
        "delivered_lots",
        "delivered_quantity",
        "trade_time",
        "contract_form",
        "region",
        "auction_type",
        "starting_price",
        "seller_inn",
        "buyer_inn",
        "seller_name",
        "buyer_name",
        "seller_broker",
        "buyer_broker",
        "payment_date",
        "delivery_date",
        "payment_days",
        "delivery_days",
      ] as const;
      return new Response(
        "\uFEFF" +
          [
            keys.join(","),
            ...rows.map((t) => keys.map((k) => csvCell(t[k])).join(",")),
          ].join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="uzex-trades.csv"',
            "Cache-Control": "no-store",
          },
        },
      );
    }
    return NextResponse.json(await listTrades(f), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
