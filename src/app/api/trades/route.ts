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
