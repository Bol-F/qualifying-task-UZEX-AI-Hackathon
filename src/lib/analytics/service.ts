import "server-only";
import { createHash } from "node:crypto";
import { allTrades } from "@/lib/db/queries";
import { createTradeStore } from "@/lib/ai/store";
import { workspace, type WorkspaceRequest } from "./workspace";
import { deriveInsights } from "./insights";
import { detectPatterns } from "./patterns";
import { selectRows } from "./workspace";
export async function loadWorkspace(
  request: WorkspaceRequest,
  signal: AbortSignal,
) {
  const from = request.from
    ? [request.from, request.compareFrom ?? request.from].sort()[0]
    : undefined;
  const to = request.to
    ? [request.to, request.compareTo ?? request.to].sort().at(-1)
    : undefined;
  const store = createTradeStore();
  const [rows, coverage] = await Promise.all([
    allTrades({ from, to }, { limit: 5000, signal }),
    store.coverage(signal),
  ]);
  const view = workspace(rows, request),
    selected = selectRows(rows, request);
  return {
    ...view,
    mode: store.mode,
    coverage,
    generatedAt: new Date().toISOString(),
    fingerprint: createHash("sha256")
      .update(JSON.stringify({ request, records: rows }))
      .digest("hex"),
    facts: deriveInsights(selected),
    patterns: detectPatterns(selected),
  };
}
export type WorkspaceData = Awaited<ReturnType<typeof loadWorkspace>>;
