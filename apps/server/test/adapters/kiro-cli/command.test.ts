import { describe, expect, it } from "vitest";
import {
  buildChatArguments,
  buildDeleteSessionArguments,
  FORBIDDEN_FLAGS,
  HEADLESS_FLAGS,
} from "../../../src/adapters/kiro-cli/command.js";

describe("headless command arguments", () => {
  it("pins the verified headless flags, with no tool trusted", () => {
    expect(buildChatArguments({})).toEqual([
      "chat",
      "--no-interactive",
      "--output-format",
      "stream-json",
      "--agent-engine",
      "v2",
      "--trust-tools=",
    ]);
    expect(HEADLESS_FLAGS).toContain("--trust-tools=");
  });

  it("adds an agent or a model only when one is configured", () => {
    const args = buildChatArguments({ agent: "restricted-agent", model: "model-id-1" });
    expect(args.slice(-4)).toEqual(["--agent", "restricted-agent", "--model", "model-id-1"]);
  });

  it("never includes an all-tools, cloud, resume or folder-trust flag", () => {
    const args = buildChatArguments({ agent: "restricted-agent", model: "model-id-1" });
    for (const flag of FORBIDDEN_FLAGS) expect(args).not.toContain(flag);
  });

  it("refuses a configured value that could be read as another flag", () => {
    expect(() => buildChatArguments({ agent: "--trust-all-tools" })).toThrow("flag value has an unaccepted shape");
    expect(() => buildChatArguments({ model: "" })).toThrow("flag value has an unaccepted shape");
  });

  it("builds a delete-session command only for an id of accepted shape", () => {
    expect(buildDeleteSessionArguments("sess-1")).toEqual(["chat", "--delete-session", "sess-1"]);
    expect(() => buildDeleteSessionArguments("--cloud")).toThrow("session id has an unaccepted shape");
    expect(() => buildDeleteSessionArguments("a b")).toThrow("session id has an unaccepted shape");
  });
});
