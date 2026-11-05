import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const names = [
  "GEMINI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AGENT_STATE_SECRET",
  "APP_API_KEY",
];
const secrets = names
  .filter((name) => process.env[name])
  .map((name) => [name, Buffer.from(process.env[name])]);
const files = await readdir(".next/static", {
  recursive: true,
  withFileTypes: true,
});
let scanned = 0;
const leaks = [];
for (const file of files) {
  if (!file.isFile()) continue;
  const path = join(file.parentPath, file.name),
    bytes = await readFile(path);
  scanned++;
  for (const [name, value] of secrets)
    if (bytes.includes(value)) leaks.push({ file: path, variable: name });
}
console.log(
  JSON.stringify({
    scannedAssets: scanned,
    configuredSecretsChecked: secrets.map(([name]) => name),
    leaks,
  }),
);
if (leaks.length) process.exitCode = 1;
