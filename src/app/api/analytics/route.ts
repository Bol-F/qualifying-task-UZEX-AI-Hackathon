import { allTrades } from "@/lib/db/queries";
import { dataMode } from "@/lib/db/client";
import { summarize } from "@/lib/analytics/calculations";
import { authorize, failure } from "@/lib/utils/api";
import { demoQuestions } from "@/lib/analytics/demo";
export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
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
