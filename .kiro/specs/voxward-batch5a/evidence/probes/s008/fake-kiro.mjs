#!/usr/bin/env node
// Acceptance fake of kiro-cli. It calls no model and uses no account. Every call is appended to $FAKE_LOG.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const log = process.env.FAKE_LOG;
const mode = process.env.FAKE_MODE ?? "ok";
function record(entry) {
  if (!log) return;
  fs.appendFileSync(log, `${JSON.stringify({ ts: Date.now(), pid: process.pid, cwd: process.cwd(), ...entry })}\n`);
}
function emit(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

if (args.includes("--delete-session")) {
  const sessionId = args[args.indexOf("--delete-session") + 1];
  record({ kind: "delete-session", sessionId, argv: args });
  process.exit(process.env.FAKE_DELETE === "fail" ? 3 : 0);
}
if (args.includes("--list-sessions")) {
  record({ kind: "list-sessions", argv: args });
  process.stdout.write(process.env.FAKE_LIST === "garbage" ? "not json\n" : `${process.env.FAKE_LIST ?? "[]"}\n`);
  process.exit(0);
}

// A chat run. The prompt arrives on stdin.
let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  stdin += chunk;
});
const sessionId = `sess-acc-${process.pid}`;
const hangs = mode === "hang" || mode === "hang-nosession" || mode === "big";
if (hangs) {
  // Name the session first, then report that the run started, then never finish.
  if (mode !== "hang-nosession") emit({ jsonrpc: "2.0", method: "session/update", params: { sessionId, update: { sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "..." } } } });
  setTimeout(() => {
    const listing = fs.readdirSync(process.cwd()).sort();
    record({ kind: "started", argv: args, envKeys: Object.keys(process.env).sort(), dirMode: (fs.statSync(process.cwd()).mode & 0o777).toString(8), listing });
    if (mode === "big") {
      const line = `${"x".repeat(1023)}\n`;
      for (let i = 0; i < 2100; i += 1) process.stdout.write(line);
    }
  }, 100);
  setInterval(() => undefined, 60_000);
} else {
  process.stdin.on("end", () => void run());
}

async function run() {
  const listing = fs.readdirSync(process.cwd()).sort();
  const sessionMode = (fs.statSync(path.join(process.cwd(), "session.json")).mode & 0o777).toString(8);
  record({ kind: "chat", argv: args, envKeys: Object.keys(process.env).sort(), stdin, dirMode: (fs.statSync(process.cwd()).mode & 0o777).toString(8), listing, sessionMode });
  if (mode === "fail") {
    process.stderr.write("SECRET-STDERR-MARKER vws_stderr_secret\n");
    process.exit(2);
  }
  emit({ jsonrpc: "2.0", method: "session/update", params: { sessionId, update: { sessionUpdate: "tool_call", toolCallId: "t1", title: "{\"items\":[]}", status: "pending" } } });
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, 800));
  const batch = JSON.parse(stdin.slice(stdin.lastIndexOf("\n\n") + 2));
  const items = batch.items.map((item) => {
    const at = [...item.text].findIndex((_, index) => [...item.text].slice(index, index + 7).join("") === "badword");
    if (at >= 0) return { itemId: item.itemId, verdict: "BLOCK", reasonCodes: ["OTHER_POLICY"], matchedSpan: { start: at, end: at + 7 } };
    return { itemId: item.itemId, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] };
  });
  if (mode === "extra") items.push({ itemId: "made-up-item", verdict: "BLOCK", reasonCodes: ["SPAM"] });
  let text = JSON.stringify({ items });
  if (mode === "prose") text = `Here is the result: ${text}`;
  const half = Math.floor(text.length / 2);
  for (const part of [text.slice(0, half), text.slice(half)]) {
    emit({ jsonrpc: "2.0", method: "session/update", params: { sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: part } } } });
  }
  emit({ jsonrpc: "2.0", id: 2, result: { sessionId, stopReason: "end_turn" } });
  process.exit(0);
}
