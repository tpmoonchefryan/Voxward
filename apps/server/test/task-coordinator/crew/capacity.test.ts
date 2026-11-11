import { describe, expect, it } from "vitest";
import {
  createDynamicConcurrency,
  pressureOf,
  targetConcurrency,
  TaskConfigError,
  type HostResourceSignal,
  type ResourceSignalPort,
} from "../../../src/modules/task-coordinator/index.js";

const CALM: HostResourceSignal = { freeMemoryRatio: 0.6, loadPerCpu: 0.3 };

/** A signal the test changes by hand. */
class SignalPort implements ResourceSignalPort {
  constructor(public signal: HostResourceSignal) {}

  read(): HostResourceSignal {
    return this.signal;
  }
}

describe("pressureOf", () => {
  it("reads a calm host as normal", () => {
    expect(pressureOf(CALM)).toBe("NORMAL");
  });

  it("reads low free memory or a busy CPU as tight", () => {
    expect(pressureOf({ freeMemoryRatio: 0.2, loadPerCpu: 0.3 })).toBe("TIGHT");
    expect(pressureOf({ freeMemoryRatio: 0.6, loadPerCpu: 1.2 })).toBe("TIGHT");
  });

  it("reads nearly exhausted memory or an overloaded CPU as critical", () => {
    expect(pressureOf({ freeMemoryRatio: 0.05, loadPerCpu: 0.3 })).toBe("CRITICAL");
    expect(pressureOf({ freeMemoryRatio: 0.6, loadPerCpu: 2.5 })).toBe("CRITICAL");
  });

  it("treats a missing or impossible reading as critical, so an unknown host shrinks", () => {
    for (const signal of [
      { freeMemoryRatio: Number.NaN, loadPerCpu: 0.3 },
      { freeMemoryRatio: 0.6, loadPerCpu: Number.NaN },
      { freeMemoryRatio: 1.5, loadPerCpu: 0.3 },
      { freeMemoryRatio: -0.1, loadPerCpu: 0.3 },
      { freeMemoryRatio: 0.6, loadPerCpu: -1 },
    ]) {
      expect(pressureOf(signal)).toBe("CRITICAL");
    }
  });
});

describe("targetConcurrency", () => {
  it("uses the maximum when the host is calm", () => {
    expect(targetConcurrency("NORMAL", { min: 1, max: 8 })).toBe(8);
  });

  it("halves under tight pressure, but never goes below the minimum", () => {
    expect(targetConcurrency("TIGHT", { min: 1, max: 8 })).toBe(4);
    expect(targetConcurrency("TIGHT", { min: 3, max: 4 })).toBe(3);
  });

  it("drops to the minimum under critical pressure", () => {
    expect(targetConcurrency("CRITICAL", { min: 2, max: 8 })).toBe(2);
  });
});

describe("createDynamicConcurrency", () => {
  it("follows the host, and each change takes effect at the next read", () => {
    const port = new SignalPort(CALM);
    const limit = createDynamicConcurrency({ min: 1, max: 6 }, port);
    expect(limit.current()).toBe(6);

    port.signal = { freeMemoryRatio: 0.2, loadPerCpu: 0.3 };
    expect(limit.current()).toBe(3);

    port.signal = { freeMemoryRatio: 0.05, loadPerCpu: 0.3 };
    expect(limit.current()).toBe(1);

    port.signal = CALM;
    expect(limit.current()).toBe(6);
  });

  it("never returns a value above the maximum or below the minimum", () => {
    const signals: HostResourceSignal[] = [
      CALM,
      { freeMemoryRatio: 0.2, loadPerCpu: 1.1 },
      { freeMemoryRatio: 0.01, loadPerCpu: 9 },
      { freeMemoryRatio: Number.NaN, loadPerCpu: 0 },
    ];
    const limit = createDynamicConcurrency({ min: 2, max: 5 }, new SignalPort(CALM));
    for (const signal of signals) {
      const port = new SignalPort(signal);
      const bounded = createDynamicConcurrency({ min: 2, max: 5 }, port);
      const value = bounded.current();
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
    }
    expect(limit.current()).toBe(5);
  });

  it("refuses bounds that cannot be used", () => {
    const port = new SignalPort(CALM);
    expect(() => createDynamicConcurrency({ min: 0, max: 4 }, port)).toThrow(TaskConfigError);
    expect(() => createDynamicConcurrency({ min: 4, max: 2 }, port)).toThrow(TaskConfigError);
    expect(() => createDynamicConcurrency({ min: 1.5, max: 4 }, port)).toThrow(TaskConfigError);
  });
});
