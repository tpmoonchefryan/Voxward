import { describe, expect, it } from "vitest";
import {
  appendBounded,
  createInitialSimulatedFeed,
  nextSimulatedChat,
  nextSimulatedSuperChat,
} from "../stream-simulator";

describe("Sandbox continuous danmaku & Super Chat stream simulator", () => {
  it("seeds initial populated feed with 4 chats and 1 active Super Chat", () => {
    const now = 1_795_520_000_000;
    const initial = createInitialSimulatedFeed(now);
    expect(initial.chats).toHaveLength(4);
    expect(initial.scs).toHaveLength(1);
    expect(initial.nextChatSeq).toBe(4);
    expect(initial.nextScSeq).toBe(1);
    expect(initial.scs[0]?.amountText).toBe("$20");
    expect(initial.scs[0]?.translation.length).toBeGreaterThan(0);
  });

  it("cycles through varied danmaku lines and multi-tier Super Chats", () => {
    const chats = Array.from({ length: 6 }, (_, i) => nextSimulatedChat(i, 1000 + i * 500));
    expect(new Set(chats.map((c) => c.id)).size).toBe(6);
    expect(new Set(chats.map((c) => c.author)).size).toBe(6);

    const scs = Array.from({ length: 6 }, (_, i) => nextSimulatedSuperChat(i, 2000 + i * 5000));
    const tiers = new Set(scs.map((s) => s.amountText));
    expect(tiers.has("$20")).toBe(true);
    expect(tiers.has("$100")).toBe(true);
    expect(tiers.has("$5")).toBe(true);
    expect(tiers.has("$50")).toBe(true);
    expect(scs.every((s) => s.translation.length > 0)).toBe(true);
  });

  it("bounds buffer length cleanly when appending continuously", () => {
    const list = [1, 2, 3];
    expect(appendBounded(list, 4, 3)).toEqual([4, 1, 2]);
    expect(appendBounded(list, 4, 0)).toEqual([]);
  });
});
