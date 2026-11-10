import { isPlainObject } from "@voxward/contracts";

/**
 * The event shape the reader assumes: an ACP `session/update` notification whose update is an agent text chunk. kiro-cli
 * 3.1.0 output has not been checked against this shape (design section 4.3). A different shape yields no business text,
 * and that fails closed.
 */
const AGENT_TEXT_UPDATE = "agent_message_chunk";

/** Accepted shape of a session id. The id later becomes a command argument, so a leading dash is refused. */
const SESSION_ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;

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
  const candidates: unknown[] = [recordOf(event.params)?.sessionId, recordOf(event.result)?.sessionId, event.sessionId];
  return candidates.find((value): value is string => typeof value === "string" && SESSION_ID_SHAPE.test(value));
}

function agentTextOf(event: JsonObject): string | undefined {
  const update = recordOf(recordOf(event.params)?.update);
  if (update?.sessionUpdate !== AGENT_TEXT_UPDATE) return undefined;
  const content = recordOf(update.content);
  if (content?.type !== "text" || typeof content.text !== "string") return undefined;
  return content.text;
}

function recordOf(value: unknown): JsonObject | undefined {
  return isPlainObject(value) ? value : undefined;
}
