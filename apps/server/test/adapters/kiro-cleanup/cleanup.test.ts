import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { removeRunDirectory, requestKiroSessionDeletion } from "../../../src/adapters/kiro-cli/cleanup.js";
import { RUN_MARKER_FILE } from "../../../src/adapters/kiro-cli/session-lifecycle.js";
import { createScratch, FAKE_CLI, fakeEnvironment, makeFakeExecutable } from "../kiro-cli/helpers.js";

function markedDirectory(parent: string, name: string): string {
  const directory = join(parent, name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, RUN_MARKER_FILE), "{}\n");
  return directory;
}

describe("run directory removal", () => {
  let scratch: string;
  let runtimeRoot: string;

  beforeAll(() => {
    scratch = createScratch("kiro-cleanup-");
    runtimeRoot = join(scratch, "runtime");
    mkdirSync(runtimeRoot, { recursive: true });
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("removes a marked run directory directly under the runtime root, and reports absence afterwards", async () => {
    const directory = markedDirectory(runtimeRoot, "run-marked-1");
    expect(await removeRunDirectory(runtimeRoot, directory)).toBe("REMOVED");
    expect(existsSync(directory)).toBe(false);
    expect(await removeRunDirectory(runtimeRoot, directory)).toBe("ABSENT");
  });

  it("refuses a directory outside the runtime root, even with the marker", async () => {
    const outside = markedDirectory(scratch, "run-outside-1");
    expect(await removeRunDirectory(runtimeRoot, outside)).toBe("REFUSED");
    expect(existsSync(outside)).toBe(true);
  });

  it("refuses a directory without the marker file", async () => {
    const unmarked = join(runtimeRoot, "run-unmarked-1");
    mkdirSync(unmarked);
    expect(await removeRunDirectory(runtimeRoot, unmarked)).toBe("REFUSED");
    expect(existsSync(unmarked)).toBe(true);
  });

  it("refuses a name without the run prefix, and the runtime root itself", async () => {
    const other = markedDirectory(runtimeRoot, "keep-1");
    expect(await removeRunDirectory(runtimeRoot, other)).toBe("REFUSED");
    expect(await removeRunDirectory(runtimeRoot, runtimeRoot)).toBe("REFUSED");
    expect(existsSync(other)).toBe(true);
    expect(existsSync(runtimeRoot)).toBe(true);
  });

  it("never follows a symbolic link, so the target survives", async () => {
    const target = markedDirectory(scratch, "elsewhere-target");
    const link = join(runtimeRoot, "run-link-1");
    symlinkSync(target, link);
    expect(await removeRunDirectory(runtimeRoot, link)).toBe("REFUSED");
    expect(existsSync(target)).toBe(true);
  });
});

describe("saved CLI session deletion", () => {
  let scratch: string;

  beforeAll(() => {
    makeFakeExecutable();
    scratch = createScratch("kiro-delete-");
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("reports NOT_OBSERVED without sending a command when the run named no session", async () => {
    const result = await requestKiroSessionDeletion({
      command: FAKE_CLI,
      env: fakeEnvironment(join(scratch, "unused.jsonl"), "ok"),
      workingDirectory: scratch,
      sessionId: undefined,
      timeoutMs: 5_000,
    });
    expect(result).toBe("NOT_OBSERVED");
  });

  it("reports DELETE_REQUESTED only when the CLI exits with status 0, which is the only claim made", async () => {
    const result = await requestKiroSessionDeletion({
      command: FAKE_CLI,
      env: fakeEnvironment(join(scratch, "delete.jsonl"), "ok"),
      workingDirectory: scratch,
      sessionId: "sess-delete-1",
      timeoutMs: 5_000,
    });
    expect(result).toBe("DELETE_REQUESTED");
  });

  it("reports DELETE_FAILED when the command cannot start, and when the id has an unaccepted shape", async () => {
    const missing = await requestKiroSessionDeletion({
      command: join(scratch, "no-such-kiro-cli"),
      env: {},
      workingDirectory: scratch,
      sessionId: "sess-delete-2",
      timeoutMs: 5_000,
    });
    expect(missing).toBe("DELETE_FAILED");

    const flagShaped = await requestKiroSessionDeletion({
      command: FAKE_CLI,
      env: {},
      workingDirectory: scratch,
      sessionId: "--cloud",
      timeoutMs: 5_000,
    });
    expect(flagShaped).toBe("DELETE_FAILED");
  });
});
