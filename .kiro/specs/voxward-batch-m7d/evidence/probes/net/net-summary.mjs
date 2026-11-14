// Summarises the guard records of one guarded run: how many processes loaded the guard, and every connection by kind.
// Usage: node net-summary.mjs <logDir>   (reads <logDir>/net/*.jsonl and <logDir>/shim.log)
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const netDir = path.join(dir, "net");
const files = fs.existsSync(netDir) ? fs.readdirSync(netDir).filter((name) => name.endsWith(".jsonl")) : [];
const kinds = {};
const loopbackPorts = {};
const refusedHosts = {};
const dnsHosts = {};
const loaded = new Set();
const all = [];
for (const name of files) {
  for (const line of fs.readFileSync(path.join(netDir, name), "utf8").split("\n")) {
    if (line.trim() === "") continue;
    const record = JSON.parse(line);
    all.push(record);
    kinds[record.kind] = (kinds[record.kind] ?? 0) + 1;
    if (record.kind === "loaded") loaded.add(record.pid);
    if (record.kind === "loopback" || record.kind === "fetch-loopback") {
      const key = `${record.host ?? "default"}:${record.port}`;
      loopbackPorts[key] = (loopbackPorts[key] ?? 0) + 1;
    }
    if (record.kind === "refused" || record.kind === "fetch-refused" || record.kind === "loopback-denied" || record.kind === "fetch-loopback-denied") {
      const key = `${record.host}:${record.port ?? ""}`;
      refusedHosts[key] = (refusedHosts[key] ?? 0) + 1;
    }
    if (record.kind === "dns") dnsHosts[record.host] = (dnsHosts[record.host] ?? 0) + 1;
  }
}
const shimPath = path.join(dir, "shim.log");
const shimCalls = fs.existsSync(shimPath) ? fs.readFileSync(shimPath, "utf8").split("\n").filter((line) => line.trim() !== "").length : null;
const summary = {
  processesWithGuard: loaded.size,
  recordsByKind: kinds,
  externalRefused: Object.entries(refusedHosts).filter(([key]) => !/^(127\.|localhost|::1|undefined|0\.0\.0\.0)/.test(key)).length,
  refusedTargets: refusedHosts,
  loopbackTargets: loopbackPorts,
  dnsRefused: dnsHosts,
  kiroShimCalls: shimCalls,
};
fs.writeFileSync(path.join(dir, "net-summary.json"), `${JSON.stringify(summary, null, 1)}\n`);
fs.writeFileSync(path.join(dir, "net.jsonl"), all.map((record) => JSON.stringify(record)).join("\n") + "\n");
console.log(JSON.stringify(summary, null, 1));
