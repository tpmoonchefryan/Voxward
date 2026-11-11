// Outbound-connection guard for acceptance runs. Loaded into every Node process through NODE_OPTIONS=--import.
// Loopback and IPC connections pass, except loopback ports that were already listening on the host before the run
// (PROBE_DENY_PORTS: the Kiro Crew gateway and every other local service). Any other TCP connect, DNS lookup or fetch
// is refused and logged.
import dns from "node:dns";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const dir = process.env.PROBE_NET_LOG_DIR;
const file = dir ? path.join(dir, `net-${process.pid}.jsonl`) : null;
function log(record) {
  if (file === null) return;
  try {
    fs.appendFileSync(file, `${JSON.stringify({ pid: process.pid, ...record })}\n`);
  } catch {
    // Logging must never break the process under test.
  }
}
log({ kind: "loaded", argv: process.argv.slice(1, 3) });

function isLoopbackHost(host) {
  if (host === undefined || host === null || host === "") return true; // Node defaults to localhost.
  const h = String(host).toLowerCase();
  return h === "localhost" || h === "::1" || h === "[::1]" || /^127\./.test(h) || h.startsWith("::ffff:127.") || h === "0.0.0.0";
}

const denyPorts = new Set(String(process.env.PROBE_DENY_PORTS ?? "").split(",").filter(Boolean).map(Number));

function refuse(socket, host, port) {
  log({ kind: "refused", host: String(host), port: port === undefined ? null : Number(port) });
  const error = Object.assign(new Error(`probe: outbound connection to ${host}:${port} refused`), { code: "ECONNREFUSED" });
  process.nextTick(() => socket.destroy(error));
  return socket;
}

const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function patchedConnect(...args) {
  let first = args[0];
  if (Array.isArray(first)) first = first[0];
  let host;
  let port;
  let ipcPath;
  if (first !== null && typeof first === "object") {
    host = first.host;
    port = first.port;
    ipcPath = first.path;
  } else if (typeof first === "number" || (typeof first === "string" && /^\d+$/.test(first))) {
    port = first;
    host = typeof args[1] === "string" ? args[1] : undefined;
  } else if (typeof first === "string") {
    ipcPath = first;
  }
  // Only a non-empty string path is IPC. https passes path: null, which must not count as IPC.
  if (typeof ipcPath === "string" && ipcPath.length > 0) {
    log({ kind: "ipc" });
    return originalConnect.apply(this, args);
  }
  if (isLoopbackHost(host)) {
    if (port !== undefined && denyPorts.has(Number(port))) {
      log({ kind: "loopback-denied", host: host === undefined ? null : String(host), port: Number(port) });
      return refuse(this, host, port);
    }
    log({ kind: "loopback", host: host === undefined ? null : String(host), port: port === undefined ? null : Number(port) });
    return originalConnect.apply(this, args);
  }
  return refuse(this, host, port);
};

const originalLookup = dns.lookup;
dns.lookup = function patchedLookup(hostname, options, callback) {
  const cb = typeof options === "function" ? options : callback;
  if (isLoopbackHost(hostname)) {
    return originalLookup.call(dns, hostname, options, callback);
  }
  log({ kind: "dns", host: String(hostname) });
  const error = Object.assign(new Error(`probe: lookup of ${hostname} refused`), { code: "ENOTFOUND", hostname });
  process.nextTick(() => cb(error));
  return {};
};

if (typeof globalThis.fetch === "function") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function patchedFetch(input, init) {
    let url;
    try {
      url = new URL(typeof input === "string" || input instanceof URL ? String(input) : input.url);
    } catch {
      return originalFetch(input, init);
    }
    if (!isLoopbackHost(url.hostname)) {
      log({ kind: "fetch-refused", host: url.hostname });
      return Promise.reject(Object.assign(new TypeError("probe: fetch refused"), { cause: { code: "ECONNREFUSED" } }));
    }
    if (url.port && denyPorts.has(Number(url.port))) {
      log({ kind: "fetch-loopback-denied", host: url.hostname, port: Number(url.port) });
      return Promise.reject(Object.assign(new TypeError("probe: fetch refused"), { cause: { code: "ECONNREFUSED" } }));
    }
    log({ kind: "fetch-loopback", host: url.hostname, port: url.port || null });
    return originalFetch(input, init);
  };
}
