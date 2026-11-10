import { describe, expect, it } from "vitest";
import { describeConfigError, loadConfig, type ConfigResult } from "../../src/config/load.js";

const noFileRead = (path: string): string => {
  throw new Error(`unexpected read of ${path}`);
};

const REQUIRED_ONLY = { VOXWARD_ADAPTERS: "synthetic" };

function failureOf(result: ConfigResult): unknown {
  if (result.ok) throw new Error("expected a configuration failure");
  return result.error;
}

describe("loadConfig", () => {
  it("applies defaults when only the required adapter set is given", () => {
    expect(loadConfig({ env: REQUIRED_ONLY, readFile: noFileRead })).toEqual({
      ok: true,
      config: { host: "127.0.0.1", port: 3000, adapters: "synthetic" },
    });
  });

  it("reads host and port from the environment", () => {
    const env = { ...REQUIRED_ONLY, VOXWARD_HOST: "127.0.0.2", VOXWARD_PORT: "3100" };
    expect(loadConfig({ env, readFile: noFileRead })).toEqual({
      ok: true,
      config: { host: "127.0.0.2", port: 3100, adapters: "synthetic" },
    });
  });

  it("reads a configuration file and lets environment values override it", () => {
    const file = JSON.stringify({ port: 4000, adapters: "synthetic" });
    const env = { VOXWARD_CONFIG_FILE: "/etc/voxward.json", VOXWARD_PORT: "4100" };
    const result = loadConfig({
      env,
      readFile: (path) => {
        expect(path).toBe("/etc/voxward.json");
        return file;
      },
    });
    expect(result).toEqual({
      ok: true,
      config: { host: "127.0.0.1", port: 4100, adapters: "synthetic" },
    });
  });

  it("rejects an unknown environment key with CONFIG_UNKNOWN_KEY", () => {
    const result = loadConfig({ env: { ...REQUIRED_ONLY, VOXWARD_PROT: "4000" }, readFile: noFileRead });
    expect(failureOf(result)).toEqual({ contractVersion: "1", code: "CONFIG_UNKNOWN_KEY", key: "VOXWARD_PROT" });
  });

  it("rejects an unknown key in the configuration file with CONFIG_UNKNOWN_KEY", () => {
    const file = JSON.stringify({ adapters: "synthetic", colour: "blue" });
    const result = loadConfig({ env: { VOXWARD_CONFIG_FILE: "/cfg.json" }, readFile: () => file });
    expect(failureOf(result)).toEqual({ contractVersion: "1", code: "CONFIG_UNKNOWN_KEY", key: "colour" });
  });

  it("rejects a missing required key with CONFIG_INVALID", () => {
    const result = loadConfig({ env: {}, readFile: noFileRead });
    expect(failureOf(result)).toEqual({
      contractVersion: "1",
      code: "CONFIG_INVALID",
      key: "adapters",
      reason: "required key is missing",
    });
  });

  it("rejects an out-of-range port with CONFIG_INVALID", () => {
    const result = loadConfig({ env: { ...REQUIRED_ONLY, VOXWARD_PORT: "70000" }, readFile: noFileRead });
    expect(failureOf(result)).toMatchObject({ code: "CONFIG_INVALID", key: "port", reason: "out of range" });
  });

  it("rejects a non-numeric port with CONFIG_INVALID", () => {
    const result = loadConfig({ env: { ...REQUIRED_ONLY, VOXWARD_PORT: "abc" }, readFile: noFileRead });
    expect(failureOf(result)).toMatchObject({
      code: "CONFIG_INVALID",
      key: "port",
      reason: "expected a different type",
    });
  });

  it("rejects an adapter set this build does not provide", () => {
    const result = loadConfig({ env: { VOXWARD_ADAPTERS: "kiro" }, readFile: noFileRead });
    expect(failureOf(result)).toMatchObject({
      code: "CONFIG_INVALID",
      key: "adapters",
      reason: "not an allowed value",
    });
  });

  it("never echoes a configured value in its error", () => {
    const result = loadConfig({ env: { VOXWARD_ADAPTERS: "super-secret-value" }, readFile: noFileRead });
    expect(JSON.stringify(failureOf(result))).not.toContain("super-secret-value");
  });

  it("reports an unreadable configuration file by key only", () => {
    const result = loadConfig({
      env: { VOXWARD_CONFIG_FILE: "/missing.json" },
      readFile: () => {
        throw new Error("ENOENT");
      },
    });
    expect(failureOf(result)).toMatchObject({
      code: "CONFIG_INVALID",
      key: "VOXWARD_CONFIG_FILE",
      reason: "file cannot be read",
    });
  });

  it("reports malformed JSON in the configuration file", () => {
    const result = loadConfig({ env: { VOXWARD_CONFIG_FILE: "/bad.json" }, readFile: () => "{ nope" });
    expect(failureOf(result)).toMatchObject({ code: "CONFIG_INVALID", reason: "file is not valid JSON" });
  });
});

describe("describeConfigError", () => {
  it("names the key and the reason, never a value", () => {
    const result = loadConfig({ env: {}, readFile: noFileRead });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(describeConfigError(result.error)).toBe("CONFIG_INVALID: adapters (required key is missing)");
  });
});
