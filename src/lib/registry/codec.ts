import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { Trade } from "../validations/trades";
import { tradeSchema } from "../validations/trades";

export type RecordCodec = {
  version: 1;
  keys: string[];
  shared: number[];
  dictionary: unknown[];
};
const unique = new Set([
  "id",
  "external_id",
  "price",
  "quantity",
  "total_amount",
  "amount_uzs",
  "usd_rate",
  "lot_size",
  "lot_count",
  "delivered_lots",
  "delivered_quantity",
  "starting_price",
]);
export function createRecordEncoder() {
  const keys = Object.keys(tradeSchema.shape),
    shared = keys.flatMap((key, i) => (unique.has(key) ? [] : [i]));
  const indices = new Set(shared),
    dictionary: unknown[] = [],
    lookup = new Map<string, number>();
  const codec: RecordCodec = { version: 1, keys, shared, dictionary };
  return {
    codec,
    encode(trade: Trade) {
      const record = trade as Record<string, unknown>;
      const values = keys.map((key, i) => {
        const value = record[key];
        if (value === undefined) return [];
        if (!indices.has(i)) return value;
        const identity = JSON.stringify(value);
        let index = lookup.get(identity);
        if (index === undefined) {
          index = dictionary.length;
          dictionary.push(value);
          lookup.set(identity, index);
        }
        return index;
      });
      return deflateRawSync(Buffer.from(JSON.stringify(values)), { level: 6 });
    },
  };
}
export function createRecordDecoder(codec?: RecordCodec) {
  const shared = new Set(codec?.shared);
  return (value: unknown): Trade => {
    if (!codec) return JSON.parse(String(value));
    if (!(value instanceof Uint8Array))
      throw new Error("Invalid packed registry record");
    const values: unknown[] = JSON.parse(
      inflateRawSync(value).toString("utf8"),
    );
    if (values.length !== codec.keys.length)
      throw new Error("Packed registry field count mismatch");
    return Object.fromEntries(
      codec.keys.flatMap((key, i) =>
        Array.isArray(values[i])
          ? []
          : [
              [
                key,
                shared.has(i) ? codec.dictionary[Number(values[i])] : values[i],
              ],
            ],
      ),
    ) as Trade;
  };
}
