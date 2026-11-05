import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Test the production runtime. Dev HMR can reload forms while tests type into them.
const next = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
function run(args) {
  return spawn(process.execPath, [next, ...args], {
    stdio: "inherit",
    env: process.env,
  });
}
let child = run(["build"]);
child.on("exit", (code) => {
  if (code !== 0) process.exit(code ?? 1);
  child = run(["start", "--hostname", "127.0.0.1", "--port", "3100"]);
  child.on("exit", (status) => process.exit(status ?? 1));
});
for (const event of ["SIGINT", "SIGTERM"])
  process.on(event, () => {
    child.kill(event);
  });
