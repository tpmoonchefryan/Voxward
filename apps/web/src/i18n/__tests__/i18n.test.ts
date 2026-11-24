import { describe, expect, it } from "vitest";
import {
  ADMIN_COPY,
  BLOCKED_COPY,
  DATA_COPY,
  DEFAULT_VOXWARD_LOCALE,
  DEFAULT_VOXWARD_THEME,
  DELETE_ACTIONS_COPY,
  DOCK_COPY,
  GUIDES_COPY,
  HOME_COPY,
  INTEGRATIONS_COPY,
  isVoxWardLocale,
  LOGIN_COPY,
  LOGS_COPY,
  MODERATION_COPY,
  NAV_COPY,
  normalizeVoxWardLocale,
  OVERLAY_COPY,
  pickLocale,
  REQUEST_STATUS_COPY,
  SANDBOX_COPY,
  SHELL_CHROME_COPY,
  SHELL_LOCALES,
  USERS_COPY,
  VOXWARD_SUPPORTED_LOCALES,
  YOUTUBE_SC_COPY,
  type VoxWardLocale,
} from "../index";

function collectLeafIssues(
  enVal: unknown,
  locVal: unknown,
  path: string,
  issues: string[],
): void {
  if (enVal === null || enVal === undefined) {
    return;
  }
  if (typeof enVal === "function") {
    if (typeof locVal !== "function") {
      issues.push(`${path}: expected function`);
    }
    return;
  }
  if (typeof enVal === "string") {
    if (typeof locVal !== "string") {
      issues.push(`${path}: expected string`);
    }
    return;
  }
  if (Array.isArray(enVal)) {
    if (!Array.isArray(locVal) || locVal.length !== enVal.length) {
      issues.push(`${path}: expected array of length ${enVal.length}`);
      return;
    }
    for (let i = 0; i < enVal.length; i += 1) {
      collectLeafIssues(enVal[i], locVal[i], `${path}[${i}]`, issues);
    }
    return;
  }
  if (typeof enVal === "object") {
    if (typeof locVal !== "object" || locVal === null) {
      issues.push(`${path}: expected object`);
      return;
    }
    const enObj = enVal as Record<string, unknown>;
    const locObj = locVal as Record<string, unknown>;
    for (const key of Object.keys(enObj)) {
      if (!(key in locObj)) {
        issues.push(`${path}.${key}: missing key`);
      } else {
        collectLeafIssues(enObj[key], locObj[key], `${path}.${key}`, issues);
      }
    }
  }
}

describe("VoxWard i18n dictionaries and defaults", () => {
  it("defaults to halloween theme and English (en) across all 5 supported locales", () => {
    expect(DEFAULT_VOXWARD_THEME).toBe("halloween");
    expect(DEFAULT_VOXWARD_LOCALE).toBe("en");
    expect(VOXWARD_SUPPORTED_LOCALES).toEqual(["en", "zh-CN", "ja", "ko", "fr"]);
    expect(SHELL_LOCALES.map((item) => item.locale)).toEqual(["en", "zh-CN", "ja", "ko", "fr"]);

    for (const loc of VOXWARD_SUPPORTED_LOCALES) {
      expect(isVoxWardLocale(loc)).toBe(true);
      expect(normalizeVoxWardLocale(loc)).toBe(loc);
    }
    expect(isVoxWardLocale("es")).toBe(false);
    expect(normalizeVoxWardLocale("es")).toBe("en");
    expect(normalizeVoxWardLocale(undefined)).toBe("en");
  });

  it("keeps structural parity across all 5 locales for every page dictionary", () => {
    const dictionaries: ReadonlyArray<[string, Readonly<Record<VoxWardLocale, unknown>>]> = [
      ["NAV_COPY", NAV_COPY],
      ["SHELL_CHROME_COPY", SHELL_CHROME_COPY],
      ["LOGIN_COPY", LOGIN_COPY],
      ["HOME_COPY", HOME_COPY],
      ["GUIDES_COPY", GUIDES_COPY],
      ["SANDBOX_COPY", SANDBOX_COPY],
      ["DOCK_COPY", DOCK_COPY],
      ["YOUTUBE_SC_COPY", YOUTUBE_SC_COPY],
      ["OVERLAY_COPY", OVERLAY_COPY],
      ["MODERATION_COPY", MODERATION_COPY],
      ["BLOCKED_COPY", BLOCKED_COPY],
      ["DATA_COPY", DATA_COPY],
      ["DELETE_ACTIONS_COPY", DELETE_ACTIONS_COPY],
      ["REQUEST_STATUS_COPY", REQUEST_STATUS_COPY],
      ["LOGS_COPY", LOGS_COPY],
      ["INTEGRATIONS_COPY", INTEGRATIONS_COPY],
      ["USERS_COPY", USERS_COPY],
      ["ADMIN_COPY", ADMIN_COPY],
    ];

    const issues: string[] = [];
    for (const [name, dict] of dictionaries) {
      const enEntry = pickLocale(dict, "en");
      for (const locale of VOXWARD_SUPPORTED_LOCALES) {
        if (!(locale in dict)) {
          issues.push(`${name}.${locale}: missing locale entry`);
          continue;
        }
        collectLeafIssues(enEntry, dict[locale], `${name}.${locale}`, issues);
      }
    }
    expect(issues).toEqual([]);
  });

  it("never claims deletion is complete in REQUEST_STATUS_COPY across any locale", () => {
    for (const locale of VOXWARD_SUPPORTED_LOCALES) {
      const copy = pickLocale(REQUEST_STATUS_COPY, locale);
      for (const label of Object.values(copy.stages)) {
        expect(label).not.toMatch(/已删除|删除完成|All data deleted/i);
      }
      expect(copy.pendingBanner(1)).not.toMatch(/已删除|删除完成|All data deleted/i);
    }
  });
});
