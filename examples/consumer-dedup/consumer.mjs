// Shows each approved delivery once, from a native output endpoint on this machine.
//
//   VOXWARD_OUTPUT_CREDENTIAL=vwo_... node examples/consumer-dedup/consumer.mjs
//   optional: VOXWARD_OUTPUT_URL (default ws://127.0.0.1:3000/output/v1/room)
//
// The credential is read from the environment only. It is never placed in the URL, because a query string can be logged.
// The script connects to 127.0.0.1 only, so it cannot send the credential to another host.

import { createDeduplicator } from "./dedupe.mjs";

const url = new URL(process.env.VOXWARD_OUTPUT_URL ?? "ws://127.0.0.1:3000/output/v1/room");
const credential = process.env.VOXWARD_OUTPUT_CREDENTIAL ?? "";

if (credential === "") {
  console.error("set VOXWARD_OUTPUT_CREDENTIAL to the credential issued for this room");
  process.exit(2);
}
if (url.hostname !== "127.0.0.1") {
  console.error("this example connects to 127.0.0.1 only");
  process.exit(2);
}
if (url.search !== "") {
  console.error("the URL must not carry a query string; the credential goes in the subprotocol list");
  process.exit(2);
}

const dedupe = createDeduplicator();
// The server selects "vw-output.v1" and never echoes the credential entry.
const socket = new WebSocket(url.href, ["vw-output.v1", `vw-cred.${credential}`]);

socket.addEventListener("message", (event) => {
  const frame = JSON.parse(String(event.data));
  if (frame.type === "HELLO") {
    console.log(`connected: ${frame.protocol}, heartbeat every ${frame.heartbeatMs} ms`);
    return;
  }
  if (!dedupe.accept(frame)) return;
  if (frame.type === "DELIVER") {
    console.log(`${frame.deliveryId} ${frame.display.text}`);
  } else {
    console.log(`${frame.deliveryId} WARD_BLOCKED`);
  }
});

socket.addEventListener("close", (event) => {
  console.log(`closed ${event.code} ${event.reason}`);
  process.exit(0);
});

socket.addEventListener("error", () => {
  console.error("connection failed");
  process.exit(1);
});

setInterval(() => dedupe.sweep(), 60_000).unref();
