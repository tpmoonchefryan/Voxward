import { describe, expect, it } from "vitest";
import {
  createNicknameVerdictCache,
  nicknameDigest,
  withNicknameVerdictCache,
} from "../../../src/modules/moderation-engine/nickname-cache/cache.js";
import type { ScopeCheck, SubjectRef } from "../../../src/modules/moderation-engine/rules/engine.js";

const subject: SubjectRef = { channelId: "channel-1", senderRef: "sender-1" };
const complete: ScopeCheck = { scope: "nickname", hits: [], complete: true };

describe("nickname verdict cache", () => {
  it("answers a lookup for the same subject, nickname digest and rule version", () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => 0 });
    cache.store(subject, "digest-a", "v1", complete);
    expect(cache.lookup(subject, "digest-a", "v1")).toBe(complete);
  });

  it("is invalidated by a rename, because the nickname digest changes", () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => 0 });
    cache.store(subject, "digest-a", "v1", complete);
    expect(cache.lookup(subject, "digest-b", "v1")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("is invalidated by a rule version change", () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => 0 });
    cache.store(subject, "digest-a", "v1", complete);
    expect(cache.lookup(subject, "digest-a", "v2")).toBeUndefined();
  });

  it("expires once the time-to-live has passed", () => {
    let current = 0;
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => current });
    cache.store(subject, "digest-a", "v1", complete);
    current = 999;
    expect(cache.lookup(subject, "digest-a", "v1")).toBe(complete);
    current = 1000;
    expect(cache.lookup(subject, "digest-a", "v1")).toBeUndefined();
  });

  it("never stores a partial result that the budget cut short", () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => 0 });
    cache.store(subject, "digest-a", "v1", { scope: "nickname", hits: [], complete: false });
    expect(cache.size()).toBe(0);
    expect(cache.lookup(subject, "digest-a", "v1")).toBeUndefined();
  });

  it("keeps subjects apart, including the same sender in another channel", () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => 0 });
    cache.store(subject, "digest-a", "v1", complete);
    expect(cache.lookup({ channelId: "channel-2", senderRef: "sender-1" }, "digest-a", "v1")).toBeUndefined();
  });

  it("evicts the least recently used subject once the limit is reached", () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 2, now: () => 0 });
    const a: SubjectRef = { channelId: "c", senderRef: "a" };
    const b: SubjectRef = { channelId: "c", senderRef: "b" };
    const c: SubjectRef = { channelId: "c", senderRef: "c" };
    cache.store(a, "d", "v1", complete);
    cache.store(b, "d", "v1", complete);
    expect(cache.lookup(a, "d", "v1")).toBe(complete);
    cache.store(c, "d", "v1", complete);
    expect(cache.lookup(b, "d", "v1")).toBeUndefined();
    expect(cache.lookup(a, "d", "v1")).toBe(complete);
    expect(cache.size()).toBe(2);
  });

  it("refuses a non-positive time-to-live or entry limit", () => {
    expect(() => createNicknameVerdictCache({ ttlMs: 0, maxEntries: 10, now: () => 0 })).toThrow(TypeError);
    expect(() => createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 0, now: () => 0 })).toThrow(TypeError);
  });
});

describe("nickname digest", () => {
  it("is the SHA-256 of the nickname text", async () => {
    expect(await nicknameDigest("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("differs when only the letter case changes, so that case-only renames are checked again", async () => {
    expect(await nicknameDigest("Viewer")).not.toBe(await nicknameDigest("viewer"));
  });
});

describe("nickname scope in front of the cache", () => {
  it("runs the nickname check once while the nickname stays the same", async () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => 0 });
    const strategy = withNicknameVerdictCache(cache, "v1");
    let runs = 0;
    const runFresh = (): ScopeCheck => {
      runs += 1;
      return complete;
    };
    await strategy(subject, "Viewer", runFresh);
    await strategy(subject, "Viewer", runFresh);
    expect(runs).toBe(1);
  });

  it("checks the nickname again after a rename, and again when the renamed nickname changes back", async () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => 0 });
    const strategy = withNicknameVerdictCache(cache, "v1");
    let runs = 0;
    const runFresh = (): ScopeCheck => {
      runs += 1;
      return complete;
    };
    await strategy(subject, "Viewer", runFresh);
    await strategy(subject, "Viewer2", runFresh);
    await strategy(subject, "Viewer", runFresh);
    expect(runs).toBe(3);
  });

  it("checks the nickname again when the rule version differs", async () => {
    const cache = createNicknameVerdictCache({ ttlMs: 1000, maxEntries: 10, now: () => 0 });
    let runs = 0;
    const runFresh = (): ScopeCheck => {
      runs += 1;
      return complete;
    };
    await withNicknameVerdictCache(cache, "v1")(subject, "Viewer", runFresh);
    await withNicknameVerdictCache(cache, "v2")(subject, "Viewer", runFresh);
    expect(runs).toBe(2);
  });
});
