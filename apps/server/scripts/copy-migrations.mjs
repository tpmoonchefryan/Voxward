// Copies the drizzle migrations next to the bundle. The migrator resolves its folder from import.meta.url,
// which points at dist/main.js once the server is bundled, so dist/migrations has to exist.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../src/db/migrations", import.meta.url));
const target = fileURLToPath(new URL("../dist/migrations", import.meta.url));

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`copy-migrations: ${source} -> ${target}`);
