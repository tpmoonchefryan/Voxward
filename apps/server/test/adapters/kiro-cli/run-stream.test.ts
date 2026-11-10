import { describe, expect, it } from "vitest";
import { parseBusinessJson, readRunStream } from "../../../src/adapters/kiro-cli/run-stream.js";

function agentText(text: string, sessionId = "sess-7"): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "session/update",
    params: { sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text } } },
  });
}

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
