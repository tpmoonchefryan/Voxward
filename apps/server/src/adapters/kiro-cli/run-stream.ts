import { StringDecoder } from "node:string_decoder";
import { isPlainObject } from "@voxward/contracts";
import { isAcceptedSessionId } from "./command.js";

/**
 * The event shape the reader assumes: an ACP `session/update` notification whose update is an agent text chunk. kiro-cli
 * 3.1.0 output has not been checked against this shape (design section 4.3). A different shape yields no business text,
 * and that fails closed.
 */
const AGENT_TEXT_UPDATE = "agent_message_chunk";

export interface RunStreamSummary {
  /** The agent text in stream order. Undefined when no agent text arrived. */
  readonly businessText: string | undefined;
  /** The first session id the stream named in the accepted shape. */
  readonly sessionId: string | undefined;
  /** Lines that were not JSON objects. They are counted and otherwise ignored. */
  readonly malformedLines: number;
}

type JsonObject = Readonly<Record<string, unknown>>;

/** Reads a JSON Lines run stream. Only agent text counts as business output. Every other event is ignored. */
export function readRunStream(stdout: string): RunStreamSummary {
  const chunks: string[] = [];
  let sessionId: string | undefined;
  let malformedLines = 0;
  for (const line of stdout.split("\n")) {
    if (line.trim() === "") continue;
    const event = parseEvent(line);
    if (event === undefined) {
      malformedLines += 1;
      continue;
    }
    sessionId ??= sessionIdOf(event);
    const text = agentTextOf(event);
    if (text !== undefined) chunks.push(text);
  }
  return {
    businessText: chunks.length === 0 ? undefined : chunks.join(""),
    sessionId,
    malformedLines,
  };
}

/**
 * Finds the first session id of a run stream while stdout is still arriving. A line can be split between two chunks, and a
 * multi-byte character can be split too, so the decoder and the unfinished line are kept between calls. The callback runs
 * once, for the first accepted id, so the caller can persist it before the run ends.
 */
export interface SessionIdScanner {
  push(chunk: Buffer): void;
  /** Reads the last line when the stream ends without a line break. */
  end(): void;
}

export function createSessionIdScanner(onSessionId: (sessionId: string) => void): SessionIdScanner {
  const decoder = new StringDecoder("utf8");
  let unfinished = "";
  let found = false;

  const scanLine = (line: string): void => {
    if (found || line.trim() === "") return;
    const event = parseEvent(line);
    const sessionId = event === undefined ? undefined : sessionIdOf(event);
    if (sessionId === undefined) return;
    found = true;
    onSessionId(sessionId);
  };

  return {
    push(chunk) {
      const lines = (unfinished + decoder.write(chunk)).split("\n");
      unfinished = lines.pop() ?? "";
      for (const line of lines) scanLine(line);
    },
    end() {
      const last = unfinished + decoder.end();
      unfinished = "";
      scanLine(last);
    },
  };
}

/** The business output must be exactly one JSON document. Prose or a code fence around it is refused, not cut away. */
export type BusinessJson = { readonly ok: true; readonly value: unknown } | { readonly ok: false };

export function parseBusinessJson(text: string): BusinessJson {
  try {
    const value: unknown = JSON.parse(text.trim());
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

function parseEvent(line: string): JsonObject | undefined {
  try {
    const value: unknown = JSON.parse(line);
    return recordOf(value);
  } catch {
    return undefined;
  }
}

function sessionIdOf(event: JsonObject): string | undefined {
  const candidates: unknown[] = [
    recordOf(event.data)?.sessionId,
    recordOf(event.params)?.sessionId,
    recordOf(event.result)?.sessionId,
    event.sessionId,
  ];
  return candidates.find((value): value is string => typeof value === "string" && isAcceptedSessionId(value));
}

function agentTextOf(event: JsonObject): string | undefined {
  const update = recordOf(recordOf(event.data)?.update) ?? recordOf(recordOf(event.params)?.update);
  if (update?.sessionUpdate !== AGENT_TEXT_UPDATE) return undefined;
  const content = recordOf(update.content);
  if (content?.type !== "text" || typeof content.text !== "string") return undefined;
  return content.text;
}

function recordOf(value: unknown): JsonObject | undefined {
  return isPlainObject(value) ? value : undefined;
}
