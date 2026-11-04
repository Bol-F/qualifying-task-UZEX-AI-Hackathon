import { authorize, failure } from "@/lib/utils/api";
import { workspaceSchema } from "@/lib/analytics/workspace";
import { loadWorkspace } from "@/lib/analytics/service";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    const params = new URL(req.url).searchParams;
    const input = workspaceSchema.parse({
      ...Object.fromEntries(params),
      products: params.getAll("product"),
      compareProducts: params.getAll("compareProduct"),
    });
    return Response.json(
      await loadWorkspace(
        input,
        AbortSignal.any([req.signal, AbortSignal.timeout(25000)]),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
