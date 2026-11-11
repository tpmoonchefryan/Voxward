import { describe, expect, it } from "vitest";
import { resolveYouTubeQuotaConfig, STREAM_LIST_QUOTA_UNITS } from "../../../src/modules/platform-source/youtube/config.js";
import { createQuotaMonitor } from "../../../src/modules/platform-source/youtube/quota.js";

const MORNING = Date.parse("2026-11-10T08:00:00.000Z");

function monitorAt(budget: number, warnRatio: number, start = MORNING) {
  let nowMs = start;
  const monitor = createQuotaMonitor({
    config: resolveYouTubeQuotaConfig({ dailyBudgetUnits: budget, warnRatio }),
    now: () => nowMs,
  });
  return {
    monitor,
    advanceTo(ms: number) {
      nowMs = ms;
    },
  };
}

describe("quota monitor", () => {
  it("counts each connection at the streamList cost, and shows the state as the budget fills", () => {
    const { monitor } = monitorAt(20, 0.5);
    const states: string[] = [];
    const allowed: boolean[] = [];

    for (let step = 0; step < 4; step += 1) {
      allowed.push(monitor.allowConnect());
      if (monitor.allowConnect()) monitor.onConnect();
      states.push(monitor.snapshot().state);
    }

    expect(STREAM_LIST_QUOTA_UNITS).toBe(5);
    expect(allowed).toEqual([true, true, true, true]);
    expect(states).toEqual(["OK", "WARNING", "WARNING", "EXHAUSTED"]);
    expect(monitor.allowConnect()).toBe(false);
    expect(monitor.snapshot()).toMatchObject({ day: "2026-11-10", usedUnits: 20, budgetUnits: 20, state: "EXHAUSTED" });
  });

  it("refuses a connection that the remaining budget cannot pay for", () => {
    const { monitor } = monitorAt(7, 1);
    monitor.onConnect();

    expect(monitor.allowConnect()).toBe(false);
    expect(monitor.snapshot().state).toBe("EXHAUSTED");
  });

  it("treats a quota answer from the platform as exhaustion, even when the local count is low", () => {
    const { monitor } = monitorAt(10_000, 0.8);

    monitor.onQuotaExceeded();

    expect(monitor.allowConnect()).toBe(false);
    expect(monitor.snapshot()).toMatchObject({ usedUnits: 0, state: "EXHAUSTED", serverReportedExhausted: true });
  });

  it("starts a new window at the next UTC day, and the platform's answer no longer applies", () => {
    const { monitor, advanceTo } = monitorAt(10_000, 0.8);
    monitor.onQuotaExceeded();
    monitor.onConnect();

    advanceTo(Date.parse("2026-11-11T00:00:01.000Z"));

    expect(monitor.allowConnect()).toBe(true);
    expect(monitor.snapshot()).toMatchObject({ day: "2026-11-11", usedUnits: 0, state: "OK", serverReportedExhausted: false });
  });

  it("counts other calls through spend, and refuses a negative or fractional amount", () => {
    const { monitor } = monitorAt(100, 0.8);

    monitor.spend(85);

    expect(monitor.snapshot().state).toBe("WARNING");
    expect(() => monitor.spend(-1)).toThrow(RangeError);
    expect(() => monitor.spend(1.5)).toThrow(RangeError);
  });
});
