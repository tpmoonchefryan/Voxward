import { describe, expect, it } from "vitest";
import {
  createSessionIdScanner,
  parseBusinessJson,
  readRunStream,
} from "../../../src/adapters/kiro-cli/run-stream.js";

function agentText(text: string, sessionId = "sess-7"): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "session/update",
    params: { sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text } } },
  });
}

/** Feeds the stream to a scanner in pieces of the given size, and returns every id it reported. */
function scanInPieces(stdout: string, pieceBytes: number): string[] {
  const found: string[] = [];
  const scanner = createSessionIdScanner((sessionId) => found.push(sessionId));
  const bytes = Buffer.from(stdout, "utf8");
  for (let offset = 0; offset < bytes.length; offset += pieceBytes) {
    scanner.push(bytes.subarray(offset, offset + pieceBytes));
  }
  scanner.end();
  return found;
}

describe("session id scanner", () => {
  const stdout = [
    JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { update: { sessionUpdate: "tool_call" } } }),
    agentText("{\"items\":[]}", "sess-live-1"),
    agentText("later", "sess-live-2"),
  ].join("\n");

  it("reports the first accepted id once, even when lines arrive split at any byte", () => {
    for (const pieceBytes of [1, 7, 64, stdout.length]) {
      expect(scanInPieces(stdout, pieceBytes)).toEqual(["sess-live-1"]);
    }
  });

  it("keeps a multi-byte character whole when its bytes arrive in separate chunks", () => {
    const withText = [agentText("中文 文本", "sess-utf-1")].join("\n");
    expect(scanInPieces(withText, 3)).toEqual(["sess-utf-1"]);
  });

  it("reads a last line that ends without a line break", () => {
    expect(scanInPieces(agentText("only line", "sess-tail-1"), 5)).toEqual(["sess-tail-1"]);
  });

  it("reports nothing for a stream without an accepted id, and for a flag-shaped id", () => {
    expect(scanInPieces(JSON.stringify({ params: { sessionId: "--cloud" } }) + "\n", 4)).toEqual([]);
    expect(scanInPieces("not json\n", 4)).toEqual([]);
  });
});

describe("run stream", () => {
  it("joins agent text chunks in stream order and ignores every other event", () => {
    const stdout = [
      JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { update: { sessionUpdate: "tool_call" } } }),
      agentText("{\"items\":"),
      agentText("[]}"),
      JSON.stringify({ jsonrpc: "2.0", id: 2, result: { stopReason: "end_turn" } }),
    ].join("\n");

    expect(readRunStream(stdout).businessText).toBe('{"items":[]}');
  });

  it("counts lines that are not JSON objects and carries on", () => {
    const summary = readRunStream(["not json", "[1,2]", agentText("ok")].join("\n"));
    expect(summary.malformedLines).toBe(2);
    expect(summary.businessText).toBe("ok");
  });

  it("reports no business text when no agent text arrived", () => {
    const summary = readRunStream(JSON.stringify({ jsonrpc: "2.0", id: 2, result: {} }));
    expect(summary.businessText).toBeUndefined();
  });

  it("takes the first session id of accepted shape, and refuses an id that looks like a flag", () => {
    const flagged = JSON.stringify({ params: { sessionId: "--cloud" } });
    expect(readRunStream([flagged, agentText("x", "sess-7")].join("\n")).sessionId).toBe("sess-7");
    expect(readRunStream(flagged).sessionId).toBeUndefined();
  });

  it("parses kiro-cli 3.4.0 stream-json envelopes carrying sessionId and update under event.data", () => {
    const stdout = [
      JSON.stringify({ type: "runStarted", data: { payloadSchema: "acp", acpProtocolVersion: 1, engine: "v2" } }),
      JSON.stringify({ type: "metadata", data: { sessionId: "f449bd15-f01a-42ab-8f10-04ebeb9ca804" } }),
      JSON.stringify({
        type: "sessionUpdate",
        data: {
          sessionId: "f449bd15-f01a-42ab-8f10-04ebeb9ca804",
          update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: '{"items":[' } },
        },
      }),
      JSON.stringify({
        type: "sessionUpdate",
        data: {
          sessionId: "f449bd15-f01a-42ab-8f10-04ebeb9ca804",
          update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "]}" } },
        },
      }),
      JSON.stringify({ type: "runFinished", data: { sessionId: "f449bd15-f01a-42ab-8f10-04ebeb9ca804", status: "success" } }),
    ].join("\n");
    const summary = readRunStream(stdout);
    expect(summary.sessionId).toBe("f449bd15-f01a-42ab-8f10-04ebeb9ca804");
    expect(summary.businessText).toBe('{"items":[]}');
    expect(summary.malformedLines).toBe(0);
    expect(scanInPieces(stdout, 17)).toEqual(["f449bd15-f01a-42ab-8f10-04ebeb9ca804"]);
  });
});

describe("business JSON", () => {
  it("accepts one JSON document, with surrounding whitespace", () => {
    expect(parseBusinessJson('  \n{"items":[]}\n ')).toEqual({ ok: true, value: { items: [] } });
  });

  it("refuses prose around the JSON, and a code fence", () => {
    expect(parseBusinessJson('Here: {"items":[]}')).toEqual({ ok: false });
    expect(parseBusinessJson('```json\n{"items":[]}\n```')).toEqual({ ok: false });
    expect(parseBusinessJson("")).toEqual({ ok: false });
  });
});
