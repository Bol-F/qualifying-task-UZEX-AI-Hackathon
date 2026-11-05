import { createReadStream, createWriteStream } from "node:fs";
import { readFile, rename, rm } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Expand the versioned, immutable synthetic snapshot at BUILD time. Runtime is read-only.
export async function prepareRegistry({
  enabled = process.env.REGISTRY_SNAPSHOT === "1",
  directory = resolve("data"),
} = {}) {
  if (!enabled) return;
  const metadata = JSON.parse(
    await readFile(resolve(directory, "registry.snapshot.json"), "utf8"),
  );
  if (
    metadata.version !== 1 ||
    !Number.isSafeInteger(metadata.bytes) ||
    metadata.bytes <= 0 ||
    metadata.bytes > 210 * 1024 * 1024 ||
    !/^[a-f0-9]{64}$/.test(metadata.sha256)
  )
    throw new Error("Invalid deployment snapshot metadata");
  const target = resolve(directory, "registry.vercel.sqlite"),
    staging = target + ".tmp";
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    await pipeline(
      createReadStream(resolve(directory, "registry.snapshot.gz")),
      createGunzip(),
      new Transform({
        transform(chunk, _encoding, callback) {
          bytes += chunk.length;
          if (bytes > metadata.bytes)
            return callback(new Error("Snapshot exceeds declared size"));
          hash.update(chunk);
          callback(null, chunk);
        },
      }),
      createWriteStream(staging),
    );
    if (bytes !== metadata.bytes || hash.digest("hex") !== metadata.sha256)
      throw new Error("Deployment snapshot checksum mismatch");
    await rename(staging, target);
    console.log(
      `Prepared read-only registry snapshot: ${metadata.count} records, ${bytes} bytes`,
    );
  } finally {
    await rm(staging, { force: true });
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  prepareRegistry().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Snapshot preparation failed",
    );
    process.exitCode = 1;
  });
