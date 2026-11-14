#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = resolve(ROOT, "apps/server/dist/bootstrap-owner.js");

if (!existsSync(BUNDLE)) {
  process.stderr.write("BOOTSTRAP_FAILED: apps/server/dist/bootstrap-owner.js not found; run `pnpm build` first\n");
  process.exit(1);
}

const { runBootstrapCli, BootstrapError } = await import(pathToFileURL(BUNDLE).href);

try {
  const result = await runBootstrapCli(process.argv.slice(2), process.env);
  process.stdout.write(`${JSON.stringify({ ok: true, accountId: result.accountId, channelId: result.channelId })}\n`);
} catch (error) {
  if (error instanceof BootstrapError) {
    process.stderr.write(`BOOTSTRAP_FAILED: ${error.code}\n`);
    process.exit(1);
  }
  const message = error instanceof Error ? error.message : "unexpected error";
  process.stderr.write(`BOOTSTRAP_FAILED: ${message}\n`);
  process.exit(1);
}
