import { TaskConfigError, type ConcurrencySource } from "../coordinator.js";

/**
 * Host resource signal, read through a port. The binding that supplies it is part of the deployment work (S029).
 * Tests inject their own values.
 */
export interface HostResourceSignal {
  /** Free memory as a fraction of the total, between 0 and 1. */
  readonly freeMemoryRatio: number;
  /** One-minute load divided by the number of CPUs. */
  readonly loadPerCpu: number;
}

export interface ResourceSignalPort {
  read(): HostResourceSignal;
}

export type HostPressure = "NORMAL" | "TIGHT" | "CRITICAL";

/** Thresholds that map a signal to a pressure level. They are implementation choices (自定) and have not been measured. */
export const PRESSURE_THRESHOLDS = {
  criticalFreeMemory: 0.1,
  criticalLoadPerCpu: 2,
  tightFreeMemory: 0.25,
  tightLoadPerCpu: 1,
} as const;

export interface ConcurrencyBounds {
  /** Lowest concurrency. At least 1, so work never stops behind a global barrier. */
  readonly min: number;
  /** Highest concurrency. The limit never exceeds it. */
  readonly max: number;
}

/** A signal with a missing or impossible number is treated as critical, so an unknown host shrinks to the minimum. */
function isUsable(signal: HostResourceSignal): boolean {
  return (
    Number.isFinite(signal.freeMemoryRatio) &&
    signal.freeMemoryRatio >= 0 &&
    signal.freeMemoryRatio <= 1 &&
    Number.isFinite(signal.loadPerCpu) &&
    signal.loadPerCpu >= 0
  );
}

export function pressureOf(signal: HostResourceSignal): HostPressure {
  if (!isUsable(signal)) return "CRITICAL";
  if (
    signal.freeMemoryRatio < PRESSURE_THRESHOLDS.criticalFreeMemory ||
    signal.loadPerCpu >= PRESSURE_THRESHOLDS.criticalLoadPerCpu
  ) {
    return "CRITICAL";
  }
  if (
    signal.freeMemoryRatio < PRESSURE_THRESHOLDS.tightFreeMemory ||
    signal.loadPerCpu >= PRESSURE_THRESHOLDS.tightLoadPerCpu
  ) {
    return "TIGHT";
  }
  return "NORMAL";
}

/** Concurrency wanted at a pressure level. The result always lies inside the bounds. */
export function targetConcurrency(pressure: HostPressure, bounds: ConcurrencyBounds): number {
  switch (pressure) {
    case "NORMAL":
      return bounds.max;
    case "TIGHT":
      return Math.max(bounds.min, Math.floor(bounds.max / 2));
    case "CRITICAL":
      return bounds.min;
  }
}

function validateBounds(bounds: ConcurrencyBounds): void {
  if (!Number.isInteger(bounds.min) || bounds.min < 1) throw new TaskConfigError("concurrency.min");
  if (!Number.isInteger(bounds.max) || bounds.max < bounds.min) throw new TaskConfigError("concurrency.max");
}

/**
 * Concurrency limit that follows the host. Each read takes a fresh signal, so a shrink takes effect at the next batch
 * decision. There is no hysteresis (自定).
 */
export function createDynamicConcurrency(bounds: ConcurrencyBounds, signal: ResourceSignalPort): ConcurrencySource {
  validateBounds(bounds);
  return {
    current(): number {
      return targetConcurrency(pressureOf(signal.read()), bounds);
    },
  };
}
