import type { InferenceResultItem } from "@voxward/contracts";
import type { CrewHandle, CrewJob, CrewPort, CrewReport } from "../../../src/modules/task-coordinator/index.js";

interface OpenSession {
  readonly batchId: string;
  readonly resolve: (report: CrewReport) => void;
}

/**
 * Stands in for Kiro Crew in tests. It runs no model and no queue. A session stays open until the test finishes it,
 * so a test chooses the order in which work completes. It is a replacement, not a model of Crew.
 */
export class FakeCrew implements CrewPort {
  /** Set to false to make Crew refuse new jobs. */
  available = true;
  readonly started: CrewJob[] = [];
  readonly cancelled: string[] = [];
  /** The most sessions that were open at the same time. */
  maxOpen = 0;
  private counter = 0;
  private readonly open = new Map<string, OpenSession>();

  async start(job: CrewJob): Promise<CrewHandle> {
    if (!this.available) throw new Error("synthetic: crew offline");
    this.counter += 1;
    const crewRef = `crew-${this.counter}`;
    this.started.push(job);
    const done = new Promise<CrewReport>((resolve) => {
      this.open.set(crewRef, { batchId: job.batchId, resolve });
    });
    this.maxOpen = Math.max(this.maxOpen, this.open.size);
    return { crewRef, done };
  }

  async cancel(crewRef: string): Promise<void> {
    this.cancelled.push(crewRef);
    this.finish(crewRef, { kind: "failed", errorCode: "CANCELLED" });
  }

  /** The session Crew opened for a batch. Fails the test when there is none. */
  refFor(batchId: string): string {
    for (const [crewRef, session] of this.open) {
      if (session.batchId === batchId) return crewRef;
    }
    throw new Error(`no open session for batch ${batchId}`);
  }

  /** Ends a session with the report Crew would give. Ending a closed session does nothing. */
  finish(crewRef: string, report: CrewReport): void {
    const session = this.open.get(crewRef);
    if (session === undefined) return;
    this.open.delete(crewRef);
    session.resolve(report);
  }

  openCount(): number {
    return this.open.size;
  }
}

/** The first job a test started. Fails the test when there is none. */
export function firstJob(crew: FakeCrew): CrewJob {
  const [job] = crew.started;
  if (job === undefined) throw new Error("no job was started");
  return job;
}

/** A completed report with one validated item per task of the job. Test data only. */
export function completedFor(
  job: CrewJob,
  classification: InferenceResultItem["classification"] = "ALLOW_NOISE",
): CrewReport {
  return {
    kind: "completed",
    items: job.items.map((item) => ({
      correlationId: item.correlationId,
      itemId: `item-${item.taskId}`,
      classification,
      reasonCodes: [],
    })),
  };
}

/** Lets every promise chain that is ready to run finish. Uses a macrotask, so microtasks drain first. */
export function flush(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}
