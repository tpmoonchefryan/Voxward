// Self-check of the outbound guard: real hosts must be refused through fetch, https and net.
import https from "node:https";
import net from "node:net";

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
for (const host of hosts) {
  results.push({ host, fetch: await viaFetch(host), https: await viaHttps(host), net: await viaNet(host) });
}
console.log(JSON.stringify(results, null, 1));
const leaked = results.some((row) => Object.values(row).some((value) => value === "CONNECTED"));
process.exit(leaked ? 1 : 0);
