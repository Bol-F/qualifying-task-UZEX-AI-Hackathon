import "server-only";
import { allTrades, datasetCoverage } from "@/lib/db/queries";
import { dataMode } from "@/lib/db/client";
import type { TradeStore } from "./tool-runner";
export function createTradeStore(): TradeStore {
  let coverage: ReturnType<TradeStore["coverage"]> | undefined;
  return {
    mode: dataMode(),
    read: (filters, signal) => allTrades(filters, { signal, limit: 5000 }),
    coverage: (signal) =>
      (coverage ??= (async () => {
        return datasetCoverage(signal);
      })()),
  };
}
