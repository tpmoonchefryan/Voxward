import { describe, expect, it } from "vitest";
import { describeKiroCli, KIRO_CLI_TESTED_VERSION } from "../../../src/adapters/kiro-cli/capabilities.js";

describe("Kiro CLI capability declaration", () => {
  it("declares the kiro-cli provider with cancellation, which the fake CLI exercises", () => {
    expect(describeKiroCli()).toEqual({ contractVersion: "1", providerName: "kiro-cli", supportsCancel: true });
  });

  it("names the release the flags were checked against", () => {
    expect(KIRO_CLI_TESTED_VERSION).toBe("3.1.0");
  });
});
