// Self-check of the outbound guard. It refuses to run, and opens no connection at all, unless net/preload.mjs is
// already loaded in this process (Q58: an unguarded self-check reaches the real hosts). With the guard loaded, every
// attempt below must be refused before any packet leaves the host.
if (globalThis.__VW_PROBE_NET_GUARD__ !== true) {
  process.stderr.write("selfcheck: GUARD NOT LOADED (run with NODE_OPTIONS=--import=<work>/net/preload.mjs); no connection attempted\n");
  process.exit(3);
}

const { default: https } = await import("node:https");
const { default: net } = await import("node:net");
const { default: dns } = await import("node:dns");

const hosts = ["oauth2.googleapis.com", "www.googleapis.com", "accounts.google.com", "prod.us-east-1.auth.desktop.kiro.dev", "example.com"];
const results = [];

async function viaFetch(host) {
  try {
    await fetch(`https://${host}/`, { signal: AbortSignal.timeout(4000) });
    return "CONNECTED";
  } catch (error) {
    return `refused:${error?.cause?.code ?? error?.code ?? error?.name}`;
  }
}
function viaHttps(host) {
  return new Promise((resolve) => {
    const request = https.get(`https://${host}/`, { timeout: 4000 }, () => resolve("CONNECTED"));
    request.on("error", (error) => resolve(`refused:${error.code}`));
    request.on("timeout", () => {
      request.destroy();
      resolve("timeout");
    });
  });
}
function viaNet(host) {
  return new Promise((resolve) => {
    const socket = net.connect(443, host, () => {
      socket.destroy();
      resolve("CONNECTED");
    });
    socket.on("error", (error) => resolve(`refused:${error.code}`));
    socket.setTimeout(4000, () => {
      socket.destroy();
      resolve("timeout");
    });
  });
}
async function viaDns(host) {
  try {
    await dns.promises.lookup(host);
    return "RESOLVED";
  } catch (error) {
    return `refused:${error.code}`;
  }
}
for (const host of hosts) {
  results.push({ host, fetch: await viaFetch(host), https: await viaHttps(host), net: await viaNet(host), dns: await viaDns(host) });
}
console.log(JSON.stringify({ guardLoaded: true, results }, null, 1));
const leaked = results.some((row) => Object.values(row).some((value) => value === "CONNECTED" || value === "RESOLVED"));
process.exit(leaked ? 1 : 0);
