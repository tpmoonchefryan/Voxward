/**
 * Quota monitor for the YouTube intake (design.md, section 6). It counts the units the intake spends and refuses a
 * connection that the budget cannot pay for. The day window is UTC (自定). A quota answer from the platform overrides the
 * local count until the window rolls over.
 */
import { STREAM_LIST_QUOTA_UNITS, type YouTubeQuotaConfig } from "./config.js";
import { type ConnectGate } from "./stream-list.js";

export type QuotaState = "OK" | "WARNING" | "EXHAUSTED";

export interface QuotaSnapshot {
  /** UTC day of the window, as YYYY-MM-DD. */
  readonly day: string;
  readonly usedUnits: number;
  readonly budgetUnits: number;
  readonly state: QuotaState;
  readonly serverReportedExhausted: boolean;
}

export interface QuotaMonitor extends ConnectGate {
  /** Counts units spent on a call other than a connection. Each connection is counted by onConnect. */
  spend(units: number): void;
  snapshot(): QuotaSnapshot;
}

export function createQuotaMonitor(options: { readonly config: YouTubeQuotaConfig; readonly now: () => number }): QuotaMonitor {
  let day = "";
  let used = 0;
  let exhaustedByServer = false;

  function rollWindow(): void {
    const today = new Date(options.now()).toISOString().slice(0, 10);
    if (today === day) return;
    day = today;
    used = 0;
    exhaustedByServer = false;
  }

  function currentState(): QuotaState {
    if (exhaustedByServer || used + STREAM_LIST_QUOTA_UNITS > options.config.dailyBudgetUnits) return "EXHAUSTED";
    if (used >= options.config.dailyBudgetUnits * options.config.warnRatio) return "WARNING";
    return "OK";
  }

  return {
    allowConnect() {
      rollWindow();
      return currentState() !== "EXHAUSTED";
    },
    onConnect() {
      rollWindow();
      used += STREAM_LIST_QUOTA_UNITS;
    },
    onQuotaExceeded() {
      rollWindow();
      exhaustedByServer = true;
    },
    spend(units) {
      if (!Number.isSafeInteger(units) || units < 0) throw new RangeError("units must be a non-negative integer");
      rollWindow();
      used += units;
    },
    snapshot() {
      rollWindow();
      return {
        day,
        usedUnits: used,
        budgetUnits: options.config.dailyBudgetUnits,
        state: currentState(),
        serverReportedExhausted: exhaustedByServer,
      };
    },
  };
}
