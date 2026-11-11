/**
 * Headless flags of every run. Checked against `kiro-cli chat --help` (kiro-cli 3.1.0, 2026-11-10) and the headless
 * documentation (design section 2). `--trust-tools=` with an empty value trusts no tool, so a tool call that needs
 * approval is denied in a non-interactive run.
 */
export const HEADLESS_FLAGS = [
  "--no-interactive",
  "--output-format",
  "stream-json",
  "--agent-engine",
  "v2",
  "--trust-tools=",
] as const;

/** Flags this adapter never passes: all-tools approval, cloud sessions, resumed sessions and folder trust. */
export const FORBIDDEN_FLAGS: readonly string[] = [
  "--trust-all-tools",
  "-a",
  "--cloud",
  "--repo",
  "--resume",
  "-r",
  "--resume-id",
  "--trust-workspace",
];

export interface RunSettings {
  /** Agent profile for the run. Omitted, the CLI uses its own default (unverified for this use). */
  readonly agent?: string;
  /** Model id for the run. Omitted, the CLI uses its own default. */
  readonly model?: string;
}

const SESSION_ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;

/** Whether a value has the shape of a CLI session id. Such an id may become a command argument. */
export function isAcceptedSessionId(value: string): boolean {
  return SESSION_ID_SHAPE.test(value);
}

/**
 * Arguments of one headless run. The instruction is not among them: it arrives on stdin, because argv is visible to
 * other local users. A flag value must not begin with `-`, so a configured value cannot turn into another flag.
 */
export function buildChatArguments(settings: RunSettings): string[] {
  const args: string[] = ["chat", ...HEADLESS_FLAGS];
  if (settings.agent !== undefined) args.push("--agent", flagValue(settings.agent));
  if (settings.model !== undefined) args.push("--model", flagValue(settings.model));
  return args;
}

/** Arguments that delete one saved CLI session by id. Only the id shape is accepted (design section 4.5). */
export function buildDeleteSessionArguments(sessionId: string): string[] {
  if (!isAcceptedSessionId(sessionId)) throw new Error("session id has an unaccepted shape");
  return ["chat", "--delete-session", sessionId];
}

/**
 * Arguments that list the sessions saved in the current directory. The CLI keeps sessions per directory, so the list
 * belongs to the run directory it is run in. The JSON output is not verified against kiro-cli 3.1.0 (design section 7).
 */
export function buildListSessionsArguments(): string[] {
  return ["chat", "--list-sessions", "-f", "json"];
}

function flagValue(value: string): string {
  if (value.length === 0 || value.startsWith("-")) throw new Error("flag value has an unaccepted shape");
  return value;
}
