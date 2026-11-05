import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import {
  createRecordEncoder,
  createRecordDecoder,
} from "../src/lib/registry/codec";
import { demoTrades } from "../src/lib/db/demo";
import { prepareRegistry } from "../scripts/prepare-registry.mjs";

test("snapshot record compression preserves exact decimals, Unicode, nulls and optional fields", () => {
  const encoder = createRecordEncoder();
  const rows = [
    {
      ...demoTrades[0],
      product_name: 'Карбамид "Б", 1-сорта',
      seller_name: "Ўзбек компанияси",
      total_amount: "999999999999999999.000001",
      payment_days: 5,
      currency: null,
    },
    {
      ...demoTrades[1],
      region: "Toshkent",
      currency: "USD",
      usd_rate: "12000.25",
      delivered_quantity: "0",
    },
  ];
  const encoded = rows.map((row) => encoder.encode(row));
  const decode = createRecordDecoder(encoder.codec);
  assert.deepEqual(encoded.map(decode), rows);
  assert.deepEqual(createRecordDecoder()(JSON.stringify(rows[0])), rows[0]);
  assert.throws(() => decode("not binary"));
});

test("deployment preparation verifies decompressed bytes and SHA-256 before replacing a snapshot", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uzex-deploy-test-"));
  const target = join(directory, "registry.vercel.sqlite"),
    contents = Buffer.from("verified snapshot bytes");
  try {
    const metadata = {
      version: 1,
      bytes: contents.length,
      sha256: createHash("sha256").update(contents).digest("hex"),
      count: 42,
    };
    await writeFile(
      join(directory, "registry.snapshot.json"),
      JSON.stringify(metadata),
    );
    await writeFile(
      join(directory, "registry.snapshot.gz"),
      gzipSync(contents),
    );
    await prepareRegistry({ enabled: true, directory });
    assert.deepEqual(await readFile(target), contents);
    await writeFile(
      join(directory, "registry.snapshot.gz"),
      gzipSync(Buffer.from("corrupt snapshot")),
    );
    await assert.rejects(
      prepareRegistry({ enabled: true, directory }),
      /checksum mismatch/,
    );
    assert.deepEqual(await readFile(target), contents);
    await writeFile(
      join(directory, "registry.snapshot.gz"),
      gzipSync(Buffer.alloc(contents.length + 1)),
    );
    await assert.rejects(
      prepareRegistry({ enabled: true, directory }),
      /declared size/,
    );
    assert.deepEqual(await readFile(target), contents);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
