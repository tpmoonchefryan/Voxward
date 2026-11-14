// Batch m7b, S021 probe E62: runs examples/consumer-dedup/consumer.mjs, unchanged, against the real app on 127.0.0.1,
// following docs/protocol/output-native-v1.md: issue a grant with the owner route, connect with the credential from the
// environment, receive DELIVER and WARD_BLOCKED, see a repeated deliveryId shown once, and get 4403 on revocation.
// Usage: tsx probe-m7b-s021-example.mts <checkout>
import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  account, addRow, CHECKOUT, check, closeAllSockets, FAR_FUTURE, finish, LONG_AGO, note, rawConsumer, rowOf, section,
  setValidity, sleep, startApp, waitUntil,
} from "./lib-m7b.mts";

const EXAMPLE = join(CHECKOUT, "examples", "consumer-dedup", "consumer.mjs");

function runConsumer(env: Record<string, string>) {
  const child = spawn(process.execPath, [EXAMPLE], {
    // NODE_OPTIONS carries the outbound guard into the child as well.
    env: { PATH: process.env.PATH ?? "", NODE_OPTIONS: process.env.NODE_OPTIONS ?? "", PROBE_NET_LOG_DIR: process.env.PROBE_NET_LOG_DIR ?? "", PROBE_DENY_PORTS: process.env.PROBE_DENY_PORTS ?? "", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out: string[] = [];
  const err: string[] = [];
  child.stdout.on("data", (chunk: Buffer) => out.push(String(chunk)));
  child.stderr.on("data", (chunk: Buffer) => err.push(String(chunk)));
  const exited = new Promise<number | null>((resolve) => child.once("exit", (code) => resolve(code)));
  return { child, out, err, exited, lines: () => out.join("").split("\n").filter((line) => line !== "") };
}

section("E example consumer against the live endpoint");
{
  const h = await startApp({ heartbeatMs: 60_000, pongTimeoutMs: 60_000, sendTimeoutMs: 400, closeGraceMs: 500 });
  const owner = await account(h.app, h.db, "owner", "channel-a", "CHANNEL_OWNER");
  const issued = await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf } });
  const { grantId, credential } = issued.json() as { grantId: string; credential: string };
  addRow(h.db, { channelId: "channel-a", n: 1, verdict: "ALLOW_MEANINGFUL", deliveryId: "d-r1", text: "approved text from the reproduction" });
  addRow(h.db, { channelId: "channel-a", n: 2, verdict: "BLOCK", deliveryId: "d-r2", text: "blocked original wording" });
  addRow(h.db, { channelId: "channel-a", n: 3, verdict: "ALLOW_MEANINGFUL", deliveryId: "d-r3", text: "expired before anyone connected" });
  setValidity(h.db, { "d-r1": FAR_FUTURE, "d-r2": FAR_FUTURE, "d-r3": LONG_AGO });
  const url = `ws://127.0.0.1:${h.port}/output/v1/room`;
  const run = runConsumer({ VOXWARD_OUTPUT_CREDENTIAL: credential, VOXWARD_OUTPUT_URL: url });
  await waitUntil(() => run.lines().length >= 3, 5_000);

  // A second, stalled consumer makes the pump send one row again: the example must show it once.
  const stalled = await rawConsumer(h.port, credential);
  stalled.socket.pause();
  addRow(h.db, { channelId: "channel-a", n: 4, verdict: "ALLOW_MEANINGFUL", deliveryId: "d-r4", text: `BIG:${"z".repeat(4 * 1024 * 1024)}` });
  setValidity(h.db, { "d-r4": FAR_FUTURE });
  await waitUntil(() => rowOf(h.db, "d-r4")?.status === "SENT", 8_000);
  await sleep(300);
  const attemptsOfR4 = rowOf(h.db, "d-r4");
  stalled.socket.destroy();

  const revoked = await h.app.inject({ method: "DELETE", url: `/channels/channel-a/output-grants/${grantId}`, headers: { cookie: owner.cookie, "x-csrf-token": owner.csrf } });
  const exitCode = await Promise.race([run.exited, sleep(5_000).then(() => "timeout")]);
  const lines = run.lines().map((line) => (line.length > 120 ? `${line.slice(0, 40)}…(${line.length} chars)` : line));
  const r4Lines = run.lines().filter((line) => line.startsWith("d-r4 ")).length;
  check("E1", lines[0] === "connected: vw-output.v1, heartbeat every 60000 ms" && lines[1] === "d-r1 approved text from the reproduction" && lines[2] === "d-r2 WARD_BLOCKED",
    "the example connects with the credential from the environment, prints HELLO, the approved text, and WARD_BLOCKED without the blocked wording", lines.slice(0, 3));
  check("E2", (attemptsOfR4?.attempts ?? 0) >= 1 && r4Lines === 1,
    "a delivery the server sent twice (one failed attempt for the stalled consumer) is shown once by deliveryId", { row: attemptsOfR4, printedLines: r4Lines });
  check("E3", revoked.statusCode === 204 && lines.includes("closed 4403 GRANT_REVOKED") && exitCode === 0,
    "revoking the grant closes the example with 4403 GRANT_REVOKED and it exits 0", { revoked: revoked.statusCode, last: lines.at(-1), exitCode });
  const everything = run.out.join("") + run.err.join("") + h.logs.join("");
  check("E4", !everything.includes(credential) && !run.out.join("").includes("blocked original wording") && !run.out.join("").includes("expired before anyone connected"),
    "the credential appears in no output or log line; the blocked wording and the expired row are not printed", null);

  const wrong = runConsumer({ VOXWARD_OUTPUT_CREDENTIAL: `vwo_${"W".repeat(43)}`, VOXWARD_OUTPUT_URL: url });
  const wrongExit = await Promise.race([wrong.exited, sleep(5_000).then(() => "timeout")]);
  const query = runConsumer({ VOXWARD_OUTPUT_CREDENTIAL: credential, VOXWARD_OUTPUT_URL: `${url}?x=1` });
  const queryExit = await Promise.race([query.exited, sleep(5_000).then(() => "timeout")]);
  const remote = runConsumer({ VOXWARD_OUTPUT_CREDENTIAL: credential, VOXWARD_OUTPUT_URL: "ws://192.0.2.10:3000/output/v1/room" });
  const remoteExit = await Promise.race([remote.exited, sleep(5_000).then(() => "timeout")]);
  const none = runConsumer({ VOXWARD_OUTPUT_URL: url });
  const noneExit = await Promise.race([none.exited, sleep(5_000).then(() => "timeout")]);
  check("E5", wrongExit === 1 && wrong.err.join("").includes("connection failed") && queryExit === 2 && remoteExit === 2 && noneExit === 2,
    "an unknown credential: 'connection failed', exit 1; a URL with a query, a host other than 127.0.0.1, or no credential: refused before connecting, exit 2", { wrongExit, queryExit, remoteExit, noneExit, remoteErr: remote.err.join("").trim() });
  note("E6", "example stdout (long lines shortened)", lines);
  closeAllSockets();
  await h.stop();
}

finish();
process.exit(0);
