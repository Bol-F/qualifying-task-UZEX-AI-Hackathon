import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { tradeSchema } from "../src/lib/validations/trades";
import { z } from "zod";
import { normalizeProduct } from "../src/lib/utils/product";
const file = process.argv[2],
  source = process.argv[3];
if (!file || !source) {
  console.error(
    "Usage: npm run import:trades -- <file.csv|file.json> <source-label> [--dry-run]",
  );
  process.exit(1);
}
async function main() {
  try {
    const content = await readFile(file, "utf8");
    const raw: unknown = file.endsWith(".json")
      ? JSON.parse(content)
      : parse(content, {
          columns: true,
          skip_empty_lines: true,
          bom: true,
          trim: true,
        });
    const records = z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(100000)
      .parse(raw);
    const imported_at = new Date().toISOString();
    const rows = records.map((record) => {
      const normalized = normalizeProduct(String(record.product_name ?? ""));
      const identity = JSON.stringify(
        Object.fromEntries(
          Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
        ),
      );
      return tradeSchema.parse({
        ...record,
        id:
          "imp-" +
          createHash("sha256")
            .update(source + "\n" + identity)
            .digest("hex"),
        external_id: record.external_id || null,
        currency: record.currency || null,
        price_unit: record.price_unit || null,
        contract_type: record.contract_type || "Unknown",
        execution_status: record.execution_status || "Unknown",
        normalized_product_name: normalized,
        data_source: source,
        imported_at,
      });
    });
    if (process.argv.includes("--dry-run")) {
      console.log(
        `Validated ${rows.length} records; ${new Set(rows.map((r) => r.id)).size} distinct records. No writes.`,
      );
      process.exit(0);
    }
    const url = process.env.SUPABASE_URL,
      key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
      );
    const db = createClient(url, key, { auth: { persistSession: false } });
    const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
    for (let offset = 0; offset < unique.length; offset += 500) {
      const { error } = await db
        .from("trades")
        .upsert(unique.slice(offset, offset + 500), { onConflict: "id" });
      if (error)
        throw new Error(
          `Import batch ${offset / 500 + 1} failed. Previous batches may have committed; rerun safely.`,
        );
    }
    console.log(
      `Imported ${unique.length} distinct records. Exact source duplicates deduplicated. Contract numbers may repeat.`,
    );
  } catch (error) {
    console.error(
      error instanceof z.ZodError
        ? JSON.stringify(
            error.issues.map((i) => ({ path: i.path, message: i.message })),
          )
        : error instanceof Error
          ? error.message
          : "Import failed",
    );
    process.exit(1);
  }
}
void main();
