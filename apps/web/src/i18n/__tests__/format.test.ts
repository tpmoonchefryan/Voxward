import { CHANGE_SUMMARY_CODES } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import {
  ADAPTER_STATUS_CODES,
  formatAdapterActionLabel,
  formatAdapterCatalogDriver,
  formatAdapterStatus,
  formatBuiltInRbacRole,
  formatBuiltInTermCategory,
  formatChangeLogSummary,
  formatLocalizedTimestamp,
  formatRetentionCategory,
  formatTechnicalStage,
  VOXWARD_SUPPORTED_LOCALES,
} from "../index";

describe("structured 5-locale formatters", () => {
  it("formats every ChangeSummaryCode across all 5 locales without empty output or unresolved braces", () => {
    const sampleParams = {
      downstream: "BLOCK",
      before: "ALLOW",
      after: "BLOCK",
      kind: "LEDGER_COMPENSATION",
      listKind: "BLACKLIST",
      version: 4,
      mode: "DELETE_AND_EXCEPT",
      requestId: "req-1",
      verdict: "VERIFIED",
      method: "MANUAL",
      state: "COMPLETED",
      purpose: "SCORING_EXCEPTION_PREFERENCE",
      classification: "ALLOW_MEANINGFUL",
      scenario: "normal-jp",
      subject: "sub-1",
    };

    for (const locale of VOXWARD_SUPPORTED_LOCALES) {
      for (const code of CHANGE_SUMMARY_CODES) {
        const formatted = formatChangeLogSummary(
          { summary: "fallback", summaryCode: code, summaryParams: sampleParams },
          locale,
        );
        expect(formatted.trim().length).toBeGreaterThan(0);
        expect(formatted).not.toContain("{");
        expect(formatted).not.toContain("}");
      }
    }

    expect(
      formatChangeLogSummary(
        { summary: "legacy custom text", summaryCode: null, summaryParams: null },
        "fr",
      ),
    ).toBe("legacy custom text");
  });

  it("formats AdapterStatusCode, drivers, and actions across all 5 locales and falls back when uncoded", () => {
    for (const locale of VOXWARD_SUPPORTED_LOCALES) {
      for (const code of ADAPTER_STATUS_CODES) {
        const out = formatAdapterStatus(
          { lastStatus: "fallback", lastStatusCode: code, lastStatusParams: { action: "probe", count: 2 } },
          locale,
        );
        expect(out.trim().length).toBeGreaterThan(0);
        expect(out).not.toContain("{");
      }
      expect(
        formatAdapterCatalogDriver("kiro-cli", { displayName: "raw", summary: "raw" }, locale).displayName,
      ).not.toBe("raw");
      expect(formatAdapterActionLabel("fetch-models", "raw", locale)).not.toBe("raw");
    }

    expect(formatAdapterStatus({ lastStatus: "Legacy text" }, "ja")).toBe("Legacy text");
    expect(formatAdapterActionLabel("custom-action", "Custom Action", "ko")).toBe("Custom Action");
  });

  it("localizes built-in categories and RBAC roles only when builtIn/systemPreset is set", () => {
    expect(
      formatBuiltInTermCategory(
        { code: "spam", label: "垃圾刷屏", description: "orig", builtIn: true },
        "en",
      ).label,
    ).toBe("Spam & Flooding");

    expect(
      formatBuiltInTermCategory(
        { code: "spam", label: "My Custom Spam Label", description: "custom", builtIn: false },
        "en",
      ).label,
    ).toBe("My Custom Spam Label");

    expect(
      formatBuiltInRbacRole(
        { id: "role-auditor", name: "只读日志审计员", description: "orig", builtIn: true },
        "fr",
      ).name,
    ).toBe("Auditeur lecture seule");

    expect(
      formatBuiltInRbacRole(
        { id: "role-custom", name: "Team Lead", description: "Custom role", builtIn: false, systemPreset: false },
        "ja",
      ).name,
    ).toBe("Team Lead");
  });

  it("localizes retention categories, technical stages, and timestamps (VW3-R-012)", () => {
    expect(formatRetentionCategory("TECHNICAL_LOG", "en")).toBe("Technical Log Metadata");
    expect(formatRetentionCategory("EVIDENCE", "zh-CN")).toBe("消息正文与翻译证据");
    expect(formatRetentionCategory("CHANGE_LOG", "ja")).toBe("変更監査ログ");
    expect(formatRetentionCategory("Custom Category", "fr")).toBe("Custom Category");

    expect(formatTechnicalStage("AI_CALL", "en")).toBe("AI Inference");
    expect(formatTechnicalStage("DELIVER", "zh-CN")).toBe("下游投递");
    expect(formatTechnicalStage("CUSTOM_STAGE", "ko")).toBe("CUSTOM_STAGE");

    expect(formatLocalizedTimestamp("not-a-date", "en")).toBe("not-a-date");
    expect(formatLocalizedTimestamp("2026-11-25T10:00:00.000Z", "en")).not.toBe("2026-11-25T10:00:00.000Z");
  });
});
