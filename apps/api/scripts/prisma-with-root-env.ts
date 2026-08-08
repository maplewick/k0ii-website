import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootEnv = resolve(apiRoot, "../../.env");

function loadRootEnv() {
  try {
    const content = readFileSync(rootEnv, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Don't overwrite Railway / shell-injected vars.
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // No local .env — rely on process env (Railway, CI).
  }
}

loadRootEnv();

const args = process.argv.slice(2);
const result = spawnSync("bunx", ["--bun", "prisma", ...args], {
  cwd: apiRoot,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
