import "server-only";
import { createHash } from "node:crypto";
import { allTrades } from "@/lib/db/queries";
import { createTradeStore } from "@/lib/ai/store";
import { workspace, type WorkspaceRequest } from "./workspace";
import { deriveInsights } from "./insights";
import { detectPatterns } from "./patterns";
import { selectRows } from "./workspace";
import { shiftDate } from "@/lib/ai/dates";
import { localRegistry } from "@/lib/registry/database";
export async function loadWorkspace(
  request: WorkspaceRequest,
  signal: AbortSignal,
) {
  const store = createTradeStore();
  const coverage = await store.coverage(signal);
  const defaultPeriod = store.mode === "local" && !request.from && !request.to;
  if (defaultPeriod && coverage.to)
    request = {
      ...request,
      from: shiftDate(coverage.to, -29),
      to: coverage.to,
    };
  const from = request.from
    ? [request.from, request.compareFrom ?? request.from].sort()[0]
    : undefined;
  const to = request.to
    ? [request.to, request.compareTo ?? request.to].sort().at(-1)
    : undefined;
  let rows;
  if (store.mode === "local") {
    const read = (a: {
      from?: string;
      to?: string;
      products: string[];
      contractType?: string;
    }) =>
      allTrades(
        {
          from: a.from,
          to: a.to,
          productNames: a.products.length ? a.products : undefined,
          contractType: a.contractType,
        },
        { limit: 50000, signal },
      );
    const selected = await read(request);
    const baseline =
      request.compareFrom ||
      request.compareTo ||
      request.compareProducts.length ||
      request.compareContractType
        ? await read({
            from: request.compareFrom ?? request.from,
            to: request.compareTo ?? request.to,
            products: request.compareProducts.length
              ? request.compareProducts
              : request.products,
            contractType: request.compareContractType ?? request.contractType,
          })
        : [];
    rows = [
      ...new Map([...selected, ...baseline].map((r) => [r.id, r])).values(),
    ];
  } else rows = await allTrades({ from, to }, { limit: 5000, signal });
  const view = workspace(rows, request),
    selected = selectRows(rows, request);
  return {
    ...view,
    options: store.mode === "local" ? localRegistry().catalog() : view.options,
    warnings: [
      ...view.warnings,
      ...(defaultPeriod
        ? [
            `Default analysis period: ${request.from} → ${request.to}. Choose dates to analyze another period.`,
          ]
        : []),
      ...(coverage.missingYears?.length
        ? [
            `Missing source years: ${coverage.missingYears.join(", ")}. Missing observations are not zero activity.`,
          ]
        : []),
      ...(view.summary.cancelled
        ? [
            `${view.summary.cancelled} cancelled records are counted in registry activity and excluded from value and quantity.`,
          ]
        : []),
    ],
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
