import type { CrewHandle, CrewJob, CrewPort, CrewReport } from "../../../src/modules/task-coordinator/index.js";

/** The one Crew call kind that never returns. `null` means every call answers. */
export type Hang = "start" | "cancel" | "done";

/**
 * Stands in for a Crew that stops answering one kind of call (B5). `start` hangs on its first call only, so a later
 * batch shows whether other channels still dispatch. `cancel` hangs until `answerHungCancels` runs. `done` never
 * settles, although an accepted cancel still closes the session. `maxOpen` is the most sessions open at once, counted
 * from start until Crew closes them. A replacement for tests, not a model of Crew.
 */
export class HungCrew implements CrewPort {
  readonly started: CrewJob[] = [];
  readonly cancelled: string[] = [];
  /** Makes the next cancel call fail at once. */
  refuseNextCancel = false;
  maxOpen = 0;
  private counter = 0;
  private startCalls = 0;
  private readonly open = new Map<string, (report: CrewReport) => void>();
  private readonly hungCancels: Array<() => void> = [];

  constructor(private readonly hang: Hang | null) {}

  async start(job: CrewJob): Promise<CrewHandle> {
    this.startCalls += 1;
    if (this.hang === "start" && this.startCalls === 1) return new Promise<CrewHandle>(() => undefined);
    this.counter += 1;
    const crewRef = `hung-${this.counter}`;
    this.started.push(job);
    const done = new Promise<CrewReport>((resolve) => this.open.set(crewRef, resolve));
    this.maxOpen = Math.max(this.maxOpen, this.open.size);
    return { crewRef, done };
  }

  async cancel(crewRef: string): Promise<void> {
    this.cancelled.push(crewRef);
    if (this.refuseNextCancel) {
      this.refuseNextCancel = false;
      throw new Error("synthetic: cancel refused");
    }
    if (this.hang === "cancel") {
      await new Promise<void>((resolve) => {
        this.hungCancels.push(() => {
          this.close(crewRef);
          resolve();
        });
      });
      return;
    }
    this.close(crewRef);
  }

  /** Lets every hung cancel return, as if Crew answered late. */
  answerHungCancels(): void {
    for (const answer of this.hungCancels.splice(0)) answer();
  }

  openCount(): number {
    return this.open.size;
  }

  private close(crewRef: string): void {
    const settle = this.open.get(crewRef);
    this.open.delete(crewRef);
    if (this.hang !== "done") settle?.({ kind: "failed", errorCode: "CANCELLED" });
  }
}
