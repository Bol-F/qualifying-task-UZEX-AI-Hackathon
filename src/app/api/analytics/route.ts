import { allTrades } from "@/lib/db/queries";
import { dataMode } from "@/lib/db/client";
import { summarize } from "@/lib/analytics/calculations";
import { authorize, failure } from "@/lib/utils/api";
import { demoQuestions } from "@/lib/analytics/demo";
import { localRegistry } from "@/lib/registry/database";
import { filtersSchema } from "@/lib/validations/trades";
export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    if (dataMode() === "local") {
      const params = new URL(req.url).searchParams;
      const filters = filtersSchema.parse({
        ...Object.fromEntries(params),
        productNames: params.has("product")
          ? params.getAll("product")
          : undefined,
      });
      const registry = localRegistry(),
        stats = registry.summary(filters);
      const dates = registry.dates(filters, undefined, 2).sort();
      const sample = registry.list({
        ...filters,
        from: dates[0] ?? filters.from,
        page: 1,
        pageSize: 100,
      }).rows;
      return Response.json(
        {
          ...stats,
          demo: demoQuestions(sample),
          latestImport: registry.coverage().latestImport,
          mode: "local",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const rows = await allTrades(
      Object.fromEntries(new URL(req.url).searchParams),
    );
    return Response.json(
      {
        ...summarize(rows),
        demo: demoQuestions(rows),
        latestImport: rows.reduce<string | null>(
          (latest, t) =>
            !latest || t.imported_at > latest ? t.imported_at : latest,
          null,
        ),
        mode: dataMode(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
