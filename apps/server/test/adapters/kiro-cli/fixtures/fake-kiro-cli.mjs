#!/usr/bin/env node
// Fake kiro-cli for tests. It calls no model and uses no account. It reads the prompt from stdin, appends what it
// received to FAKE_KIRO_LOG, and prints synthetic stream-json events. FAKE_KIRO_MODE selects the behaviour.
// FAKE_KIRO_LIST selects the output of `--list-sessions` (one, none or garbage) and FAKE_KIRO_DELETE=fail makes
// `--delete-session` exit with status 3. Both are unverified against the real CLI (design section 7).
// Node built-ins only. The business output is synthetic: a text containing "badword" is BLOCK, anything else is allowed.
import { appendFileSync, readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const logPath = process.env.FAKE_KIRO_LOG;
const mode = process.env.FAKE_KIRO_MODE ?? "ok";
const sessionId = "sess-fake-1";

function record(entry) {
  if (logPath === undefined) return;
  const line = { pid: process.pid, cwd: process.cwd(), argv, envKeys: Object.keys(process.env).sort(), ...entry };
  appendFileSync(logPath, `${JSON.stringify(line)}\n`);
}

function emit(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

function update(content) {
  return { jsonrpc: "2.0", method: "session/update", params: { sessionId, update: content } };
}

function agentText(text) {
  return update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text } });
}

function toolCall() {
  return update({ sessionUpdate: "tool_call", title: "noise that is not business output" });
}

function finalResult() {
  return { jsonrpc: "2.0", id: 2, result: { sessionId, stopReason: "end_turn" } };
}

function classify(text) {
  if (text.includes("badword")) {
    return { verdict: "BLOCK", reasonCodes: ["HARASSMENT"], matchedSpan: { start: 0, end: 1 } };
  }
  return { verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] };
}

function listingOutput(listMode) {
  if (listMode === "one") return JSON.stringify([{ sessionId: "sess-listed-1" }]);
  if (listMode === "garbage") return "not a listing";
  return "[]";
}

if (argv.includes("--delete-session")) {
  record({ kind: "delete-session", sessionId: argv[argv.indexOf("--delete-session") + 1] });
  process.exitCode = process.env.FAKE_KIRO_DELETE === "fail" ? 3 : 0;
} else if (argv.includes("--list-sessions")) {
  record({ kind: "list-sessions" });
  process.stdout.write(listingOutput(process.env.FAKE_KIRO_LIST));
} else {
  const stdin = readFileSync(0, "utf8");
  record({ kind: "chat", stdin });
  const batch = JSON.parse(stdin.slice(stdin.lastIndexOf('{"items":')));

  if (mode === "hang") {
    record({ kind: "started" });
    emit(update({ sessionUpdate: "tool_call", title: "started" }));
    setInterval(() => {}, 1000);
  } else if (mode === "fail") {
    process.stderr.write("stderr-secret-marker: the model said something private\n");
    process.exitCode = 2;
  } else if (mode === "huge") {
    process.stdout.write("x".repeat(3 * 1024 * 1024));
  } else if (mode === "no-text") {
    emit(toolCall());
    emit(finalResult());
  } else if (mode === "not-json") {
    emit(agentText("Here is the result: {\"items\":[]}"));
    emit(finalResult());
  } else {
    const items = batch.items.map((item) => ({ itemId: item.itemId, ...classify(item.text) }));
    if (mode === "invalid") items.push({ itemId: "zz-extra", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"] });
    const body = JSON.stringify({ items });
    const middle = Math.floor(body.length / 2);
    emit(toolCall());
    emit(agentText(body.slice(0, middle)));
    emit(agentText(body.slice(middle)));
    emit(finalResult());
  }
}
