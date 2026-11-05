import "server-only";
import { allTrades, datasetCoverage } from "@/lib/db/queries";
import { dataMode } from "@/lib/db/client";
import type { TradeStore } from "./tool-runner";
import { localRegistry } from "@/lib/registry/database";
import { filtersSchema } from "@/lib/validations/trades";
export function createTradeStore(): TradeStore {
  let coverage: ReturnType<TradeStore["coverage"]> | undefined;
  return {
    mode: dataMode(),
    read: (filters, signal) =>
      allTrades(filters, {
        signal,
        limit: dataMode() === "local" ? 50000 : 5000,
      }),
    ...(dataMode() === "local"
      ? {
          dates: async (
            filters: Parameters<TradeStore["read"]>[0],
            before?: string,
            limit?: number,
          ) =>
            localRegistry().dates(filtersSchema.parse(filters), before, limit),
        }
      : {}),
    coverage: (signal) =>
      (coverage ??= (async () => {
        return datasetCoverage(signal);
      })()),
  };
}
