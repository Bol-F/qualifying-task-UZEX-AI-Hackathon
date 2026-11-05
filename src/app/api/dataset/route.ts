import { authorize, failure } from "@/lib/utils/api";
import { dataMode } from "@/lib/db/client";
import { datasetCoverage } from "@/lib/db/queries";
import { localRegistry } from "@/lib/registry/database";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    return Response.json(
      dataMode() === "local"
        ? localRegistry().manifest()
        : {
            mode: dataMode(),
            ...(await datasetCoverage(req.signal)),
          },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
